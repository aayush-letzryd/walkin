/* ═══════════════════════════════════════════════════════════
   LetzRyd Walk-In Registry — script.js
   SurveyJS form + metrics dashboard + records table
═══════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────
// SurveyJS Form Definition
// ─────────────────────────────────────────────────────────
const surveyJson = {
    showQuestionNumbers: "off",
    widthMode: "responsive",

    // Custom completion HTML (shown after a successful submit)
    completedHtml: `
        <div style="text-align:center;padding:48px 24px;">
            <svg style="width:64px;height:64px;color:#1ab394;margin:0 auto 20px;display:block;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke-linecap="round" stroke-linejoin="round"/>
                <polyline points="22 4 12 14.01 9 11.01" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <h2 style="font-size:22px;font-weight:700;color:#0a1650;margin-bottom:8px;font-family:'Poppins',sans-serif;">Walk-In Recorded Successfully</h2>
            <p style="color:#64748b;font-size:14px;margin-bottom:28px;font-family:'DM Sans',sans-serif;">The record has been saved to the database.</p>
            <button onclick="startNewWalkin()" style="background:#1ab394;color:#fff;border:none;border-radius:8px;padding:10px 28px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">
                + Record Another Walk-In
            </button>
        </div>
    `,

    elements: [
        {
            type: "panel",
            name: "visit_categorization_panel",
            title: "1. VISIT CATEGORIZATION",
            width: "33%",
            elements: [
                {
                    type: "radiogroup",
                    name: "visitor_type",
                    title: "VISITOR CLASSIFICATION",
                    choices: [
                        { value: "Driver", text: "Driver Walk-In" },
                        { value: "Partner", text: "Partner Walk-In" }
                    ],
                    colCount: 2,
                    isRequired: true
                },
                {
                    type: "text",
                    name: "event_date",
                    title: "DATE OF CHECK-IN",
                    inputType: "date",
                    defaultValue: new Date().toISOString().substring(0, 10),
                    isRequired: true
                },
                {
                    type: "dropdown",
                    name: "city",
                    title: "OPERATING CITY HUB",
                    placeholder: "Select active city...",
                    isRequired: true,
                    choicesByUrl: {
                        url: "/api/cities",
                        valueName: "value",
                        titleName: "text"
                    }
                },
                {
                    type: "dropdown",
                    name: "executive_id",
                    title: "ATTENDING EXECUTIVE",
                    placeholder: "Select operational executive...",
                    isRequired: true,
                    choicesByUrl: {
                        url: "/api/executives",
                        valueName: "value",
                        titleName: "text"
                    }
                },
                {
                    type: "text",
                    name: "executive_name",
                    title: "EXECUTIVE DETAILS (AUTO-POPULATED)",
                    placeholder: "Auto-populated upon select...",
                    readOnly: true
                }
            ]
        },
        {
            type: "panel",
            name: "candidate_information_panel",
            title: "2. CANDIDATE INFORMATION",
            width: "33%",
            startWithNewLine: false,
            elements: [
                {
                    type: "text",
                    name: "person_name",
                    title: "PERSON'S FULL NAME",
                    placeholder: "Enter full legal name...",
                    isRequired: true
                },
                {
                    type: "text",
                    name: "person_number",
                    title: "PHONE NUMBER",
                    inputType: "tel",
                    placeholder: "+91 10-digit mobile number...",
                    description: "10-digit primary mobile contact",
                    isRequired: true
                },
                {
                    type: "text",
                    name: "dl_number",
                    title: "DRIVING LICENSE NUMBER",
                    placeholder: "e.g. TS09 20210045612...",
                    description: "Provide full active Driving License number",
                    isRequired: true
                },
                {
                    type: "text",
                    name: "aadhaar_number",
                    title: "AADHAAR CARD NUMBER",
                    placeholder: "12-digit Aadhaar card number",
                    description: "12-digit number (Optional)",
                    isRequired: false,
                    maxLength: 14
                }
            ]
        },
        {
            type: "panel",
            name: "purpose_outcomes_panel",
            title: "VISIT PURPOSE & OUTCOMES",
            width: "34%",
            startWithNewLine: false,
            elements: [
                {
                    type: "radiogroup",
                    name: "visiting_reason",
                    title: "VISITING REASON",
                    defaultValue: "Onboarding",
                    choices: ["Onboarding", "Enquiry", "Support"],
                    colCount: 3,
                    isRequired: true
                },
                {
                    type: "radiogroup",
                    name: "joined_status",
                    title: "ONBOARDING OUTCOME STATUS",
                    defaultValue: "Pending",
                    choices: ["Joined", "Pending", "Not Interested"],
                    colCount: 3,
                    isRequired: true
                },
                {
                    type: "comment",
                    name: "remarks",
                    title: "REMARKS / NOTES",
                    placeholder: "Document action items, background results, operational obstacles, or key details...",
                    isRequired: false,
                    rows: 4
                }
            ]
        },
        {
            type: "panel",
            name: "secure_document_uploads_panel",
            title: "3. SECURE DOCUMENT UPLOADS (OPTIONAL)",
            description: "Please scan or upload candidate DL & Aadhaar copies for verified onboarding.",
            width: "100%",
            elements: [
                {
                    type: "file",
                    name: "aadhaar_image",
                    title: "AADHAAR CARD PHOTO",
                    placeholder: "Scan or Upload Aadhaar Card Photo\nDrag image here or tap to launch camera",
                    acceptedTypes: "image/*",
                    allowMultiple: false,
                    storeDataAsText: true,
                    allowCameraAccess: true,
                    isRequired: false,
                    width: "50%"
                },
                {
                    type: "file",
                    name: "dl_image",
                    title: "DRIVING LICENSE PHOTO",
                    placeholder: "Scan or Upload Driving License Photo\nDrag image here or click to browse",
                    acceptedTypes: "image/*",
                    allowMultiple: false,
                    storeDataAsText: true,
                    allowCameraAccess: true,
                    isRequired: false,
                    width: "50%",
                    startWithNewLine: false
                }
            ]
        }
    ]
};

// ─────────────────────────────────────────────────────────
// Survey instance
// ─────────────────────────────────────────────────────────
const survey = new Survey.Model(surveyJson);
let walkinId = null; // null = new record, integer = editing existing



// ─────────────────────────────────────────────────────────
// Value change handlers
// ─────────────────────────────────────────────────────────
survey.onValueChanged.add(function (sender, options) {
    // Auto-populate executive name when executive_id changes
    if (options.name === "executive_id") {
        const uid = options.value;
        if (uid) {
            fetch("/api/executives/" + uid)
                .then(function (r) {
                    if (!r.ok) throw new Error("Not found");
                    return r.json();
                })
                .then(function (data) {
                    sender.setValue("executive_name", data.name + " · " + data.role);
                })
                .catch(function () {
                    sender.setValue("executive_name", "Executive not found");
                });
        } else {
            sender.setValue("executive_name", "");
        }
    }
});

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
function loadWalkinIntoForm(id) {
    fetch("/api/walkins/" + id)
        .then(function (r) {
            if (!r.ok) throw new Error("Not found");
            return r.json();
        })
        .then(function (data) {
            walkinId = id;
            // Compose survey data (file fields excluded — they start fresh on edit)
            var d = {
                visitor_type:    data.visitor_type,
                event_date:      data.event_date,
                city:            data.city,
                executive_id:    data.executive_id,
                person_name:     data.person_name,
                person_number:   data.person_number,
                aadhaar_number:  data.aadhaar_number || "",
                dl_number:       data.dl_number,
                visiting_reason: data.visiting_reason,
                joined_status:   data.joined_status,
                remarks:         data.remarks || ""
            };
            survey.data = d;

            // Fetch executive name separately (bulk set doesn't trigger onValueChanged)
            if (data.executive_id) {
                fetch("/api/executives/" + data.executive_id)
                    .then(function (r) { return r.json(); })
                    .then(function (exec) {
                        survey.setValue("executive_name", exec.name + " · " + exec.role);
                    })
                    .catch(function () {
                        if (data.executive_name) {
                            survey.setValue("executive_name", data.executive_name);
                        }
                    });
            }

            updateFormBanner(true, id);
            showTab("form");
            scrollToForm();
        })
        .catch(function () {
            alert("Walk-in #" + id + " not found in database.");
            walkinId = null;
            updateFormBanner(false, null);
        });
}

function updateFormBanner(editing, id) {
    var el = document.getElementById("formSubtext");
    if (el) {
        el.textContent = editing ? ("Editing existing walk-in record #" + id) : "Digital Check-In Form for Drivers & Partners";
    }
}

function scrollToForm() {
    var el = document.getElementById("surveyElement");
    if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function extractImage(val) {
    if (!val) return null;
    if (Array.isArray(val) && val.length > 0) {
        var first = val[0];
        return (typeof first === "object" && first.content) ? first.content : String(first);
    }
    if (typeof val === "string" && val.startsWith("data:")) return val;
    return null;
}

// ─────────────────────────────────────────────────────────
// URL param — support ?walkin_id=123 for direct edit links
// ─────────────────────────────────────────────────────────
(function () {
    var params = new URLSearchParams(window.location.search);
    var uid = params.get("walkin_id");
    if (uid && parseInt(uid) > 0) {
        walkinId = parseInt(uid);
        loadWalkinIntoForm(walkinId);
    }
})();

// ─────────────────────────────────────────────────────────
// Submit handler
// ─────────────────────────────────────────────────────────
survey.onComplete.add(function (sender) {
    var d = sender.data;

    var payload = {
        visitor_type:    d.visitor_type,
        event_date:      d.event_date,
        city:            d.city,
        executive_id:    d.executive_id,
        person_name:     d.person_name,
        person_number:   d.person_number,
        aadhaar_number:  d.aadhaar_number  || null,
        dl_number:       d.dl_number,
        aadhaar_image:   extractImage(d.aadhaar_image),
        dl_image:        extractImage(d.dl_image),
        visiting_reason: d.visiting_reason,
        joined_status:   d.joined_status,
        remarks:         d.remarks || ""
    };

    var url    = walkinId ? ("/api/walkins/" + walkinId) : "/api/walkins";
    var method = walkinId ? "PUT" : "POST";

    fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error(t); });
        return r.json();
    })
    .then(function (result) {
        if (result.success) {
            // Refresh metrics and table in background
            loadMetrics();
            loadTable();
            walkinId = null;
            updateFormBanner(false, null);
            // SurveyJS will show the completedHtml automatically
        } else {
            throw new Error("Server returned success=false");
        }
    })
    .catch(function (err) {
        alert("Failed to save record: " + err.message);
        // Allow the user to try again — restart the survey
        survey.clear(true, true);
    });
});

// ─────────────────────────────────────────────────────────
// Initialize SurveyJS into DOM
// ─────────────────────────────────────────────────────────
$(function () {
    $("#surveyElement").Survey({ model: survey });
});

// ─────────────────────────────────────────────────────────
// New Walk-In (reset everything)
// ─────────────────────────────────────────────────────────
function startNewWalkin() {
    walkinId = null;
    survey.clear(true, true);
    updateFormBanner(false, null);
    scrollToForm();
}

// ─────────────────────────────────────────────────────────
// Edit from table row
// ─────────────────────────────────────────────────────────
function editRecord(id) {
    survey.clear(true, true);   // reset form before loading new data
    loadWalkinIntoForm(id);
}

// ─────────────────────────────────────────────────────────
// Metrics
// ─────────────────────────────────────────────────────────
function loadMetrics() {
    fetch("/api/stats")
        .then(function (r) { return r.json(); })
        .then(function (data) {
            setText("stat-total",   data.total);
            setText("stat-joined",  data.joined);
            setText("stat-pending", data.pending);
            setText("stat-rate",    data.conversion_rate + "%");
            setText("stat-drivers-count", data.drivers);
            setText("stat-partners-count", data.partners);
            
            var rateBar = document.getElementById("rateBarFill");
            if (rateBar) {
                rateBar.style.width = data.conversion_rate + "%";
            }
        })
        .catch(function (e) { console.error("Metrics error:", e); });
}

function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
}

// ─────────────────────────────────────────────────────────
// Records Table
// ─────────────────────────────────────────────────────────
var allRecords = []; // stored for client-side search

function loadTable() {
    fetch("/api/walkins")
        .then(function (r) { return r.json(); })
        .then(function (records) {
            allRecords = records;
            renderTable(records);
        })
        .catch(function (e) { console.error("Table error:", e); });
}

function renderTable(records) {
    var tbody = document.getElementById("walkinTableBody");
    if (!tbody) return;

    if (!records || records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="lr-table-empty">No walk-in records found.</td></tr>';
        return;
    }

    var rows = records.map(function (r) {
        var typeClass   = r.visitor_type === "Driver" ? "lr-badge-driver" : "lr-badge-partner";
        var statusClass = r.joined_status === "Joined"
            ? "lr-status-green"
            : r.joined_status === "Pending"
                ? "lr-status-yellow"
                : "lr-status-red";
        var date = r.event_date ? r.event_date.substring(0, 10) : "—";

        return [
            "<tr>",
            "  <td class='font-bold text-brand-blue font-mono'>#" + r.id + "</td>",
            "  <td>",
            "    <div class='font-extrabold text-gray-900'>" + escHtml(r.person_name || "—") + "</div>",
            "    <div class='text-xs text-gray-400 font-sans mt-0.5'>Date: " + date + "</div>",
            "  </td>",
            "  <td>",
            "    <div class='text-gray-700 font-semibold'>" + escHtml(r.person_number || "—") + "</div>",
            "    <div class='text-xs font-mono text-gray-400 mt-0.5'>" + escHtml(r.dl_number || "—") + "</div>",
            "  </td>",
            "  <td>",
            "    <span class='lr-badge " + typeClass + "'>" + escHtml(r.visitor_type) + "</span>",
            "    <div class='text-xs text-gray-500 font-sans mt-1 font-semibold'>" + escHtml(r.visiting_reason || "—") + "</div>",
            "  </td>",
            "  <td class='text-gray-600 font-semibold capitalize'>" + escHtml(r.city_name || r.city || "—") + "</td>",
            "  <td>",
            "    <div class='font-semibold text-gray-700'>" + escHtml(r.executive_name || "—") + "</div>",
            "    <div class='text-xs text-gray-400 font-mono mt-0.5'>ID: " + escHtml(r.executive_id || "—") + "</div>",
            "  </td>",
            "  <td>",
            "    <span class='lr-status " + statusClass + "'>" + escHtml(r.joined_status) + "</span>",
            "  </td>",
            "  <td class='text-center'>",
            "    <div class='lr-actions'>",
            "      <button class='lr-action-btn lr-action-btn-edit' title='Edit' onclick='editRecord(" + r.id + ")'>",
            "        <svg viewBox='0 0 24 24' width='14' height='14' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/><path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/></svg>",
            "      </button>",
            "      <button class='lr-action-btn lr-action-btn-delete' title='Delete' onclick='deleteRecord(" + r.id + ", \"" + escHtml(r.person_name || "Record") + "\")'>",
            "        <svg viewBox='0 0 24 24' width='14' height='14' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/><line x1='10' y1='11' x2='10' y2='17'/><line x1='14' y1='11' x2='14' y2='17'/></svg>",
            "      </button>",
            "    </div>",
            "  </td>",
            "</tr>"
        ].join("");
    });

    tbody.innerHTML = rows.join("");
}

function escHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// Client-side search/filter
function filterTable(query) {
    var q = query ? query.toLowerCase() : "";
    var cityFilter = document.getElementById("filterCity")?.value || "all";
    var typeFilter = document.getElementById("filterType")?.value || "all";
    var statusFilter = document.getElementById("filterStatus")?.value || "all";

    var filtered = allRecords.filter(function (r) {
        // Dropdown filters
        if (cityFilter !== "all" && r.city_name !== cityFilter) return false;
        if (typeFilter !== "all" && r.visitor_type !== typeFilter) return false;
        if (statusFilter !== "all" && r.joined_status !== statusFilter) return false;

        // Text search
        if (q) {
            return (
                (r.person_name   && r.person_name.toLowerCase().includes(q))   ||
                (r.person_number && r.person_number.toLowerCase().includes(q)) ||
                (r.dl_number     && r.dl_number.toLowerCase().includes(q))     ||
                (r.aadhaar_number && r.aadhaar_number.toLowerCase().includes(q)) ||
                (r.city_name     && r.city_name.toLowerCase().includes(q))     ||
                (r.executive_name && r.executive_name.toLowerCase().includes(q)) ||
                (r.id            && String(r.id).includes(q))
            );
        }
        return true;
    });
    renderTable(filtered);
    
    // Populate city dropdown if it's empty (only "all" option exists)
    var citySelect = document.getElementById("filterCity");
    if (citySelect && citySelect.options.length <= 1) {
        var cities = new Set();
        allRecords.forEach(function(r) { if (r.city_name) cities.add(r.city_name); });
        Array.from(cities).sort().forEach(function(c) {
            var opt = document.createElement("option");
            opt.value = c;
            opt.textContent = c;
            citySelect.appendChild(opt);
        });
    }

    var tableFooterCount = document.getElementById("tableFooterCount");
    if (tableFooterCount) {
        tableFooterCount.textContent = "Showing " + filtered.length + " of " + allRecords.length + " database entries";
    }
}

// ─────────────────────────────────────────────────────────
// Live clock (IST)
// ─────────────────────────────────────────────────────────
function updateClock() {
    var el = document.getElementById("liveClock");
    if (el) {
        el.textContent = new Date().toLocaleTimeString("en-IN", {
            timeZone: "Asia/Kolkata",
            hour12: true
        });
    }
}
setInterval(updateClock, 1000);
updateClock();

// ─────────────────────────────────────────────────────────
// Wire up buttons & inputs after DOM is ready
// ─────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {

    // Initial data load
    loadMetrics();
    loadTable();

    // New Walk-in button
    var btnNew = document.getElementById("btnNewWalkin");
    if (btnNew) {
        btnNew.addEventListener("click", function () {
            startNewWalkin();
        });
    }

    // Refresh button
    var btnRefresh = document.getElementById("btnRefresh");
    if (btnRefresh) {
        btnRefresh.addEventListener("click", function () {
            loadMetrics();
            loadTable();
        });
    }

    // Search box
    var search = document.getElementById("tableSearch");
    if (search) {
        var debounceTimer;
        search.addEventListener("input", function () {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function () {
                filterTable(search.value.trim());
            }, 250);
        });
    }

    // Export CSV
    var btnExport = document.getElementById("btnExportCSV");
    if (btnExport) {
        btnExport.addEventListener("click", exportCSV);
    }

    // Form header search (Retrieve button)
    var btnRetrieve = document.getElementById("formSearchBtn");
    var inputRetrieve = document.getElementById("formSearchInput");
    if (btnRetrieve && inputRetrieve) {
        btnRetrieve.addEventListener("click", function() {
            var val = parseInt(inputRetrieve.value);
            if (val > 0) loadWalkinIntoForm(val);
        });
        inputRetrieve.addEventListener("keypress", function(e) {
            if (e.key === "Enter") {
                var val = parseInt(inputRetrieve.value);
                if (val > 0) loadWalkinIntoForm(val);
            }
        });
    }
    
    // Add Walk-in (from Registry tab)
    var btnAddWalkin = document.getElementById("btnAddWalkin");
    if (btnAddWalkin) {
        btnAddWalkin.addEventListener("click", function() {
            showTab("form");
            startNewWalkin();
        });
    }
    
    // City, Type, Status filters
    ['filterCity', 'filterType', 'filterStatus'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) {
            el.addEventListener("change", function() {
                filterTable(document.getElementById("tableSearch")?.value || "");
            });
        }
    });

    // Logo click goes to form
    var logoHome = document.getElementById("logoHome");
    if (logoHome) {
        logoHome.addEventListener("click", function() {
            showTab("form");
        });
    }
    
    // Set initial filter to populate counts and dropdown
    filterTable("");
});

// ─────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────
window.showTab = function(tab) {
    var formTab = document.getElementById("tab-form");
    var regTab = document.getElementById("tab-registry");
    if (formTab) formTab.style.display = (tab === 'form') ? 'block' : 'none';
    if (regTab) regTab.style.display = (tab === 'registry') ? 'block' : 'none';
    
    var btnForm = document.getElementById("tabBtnForm");
    var btnReg = document.getElementById("tabBtnRegistry");
    
    if (tab === 'form') {
        if (btnForm) btnForm.classList.add("lr-tab--active");
        if (btnReg) btnReg.classList.remove("lr-tab--active");
    } else {
        if (btnReg) btnReg.classList.add("lr-tab--active");
        if (btnForm) btnForm.classList.remove("lr-tab--active");
        loadMetrics();
        loadTable();
    }
};

// ─────────────────────────────────────────────────────────
// Delete Record
// ─────────────────────────────────────────────────────────
window.deleteRecord = function(id, name) {
    if (confirm("Delete walk-in for " + name + " (#" + id + ")? This cannot be undone.")) {
        fetch("/api/walkins/" + id, { method: "DELETE" })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.success) {
                    loadMetrics();
                    loadTable();
                } else {
                    alert("Failed to delete record.");
                }
            })
            .catch(function(err) { alert("Error: " + err.message); });
    }
};

// ─────────────────────────────────────────────────────────
// Export CSV
// ─────────────────────────────────────────────────────────
window.exportCSV = function() {
    if (!allRecords || allRecords.length === 0) {
        alert("No records to export.");
        return;
    }
    
    var headers = ['ID', 'Candidate Name', 'Phone', 'Visitor Type', 'City', 'Executive Name', 'Reason', 'Status', 'Date'];
    var csvRows = [];
    csvRows.push(headers.join(','));
    
    allRecords.forEach(function(r) {
        var values = [
            r.id,
            "\"" + (r.person_name || "") + "\"",
            "\"" + (r.person_number || "") + "\"",
            "\"" + (r.visitor_type || "") + "\"",
            "\"" + (r.city_name || r.city || "") + "\"",
            "\"" + (r.executive_name || "") + "\"",
            "\"" + (r.visiting_reason || "") + "\"",
            "\"" + (r.joined_status || "") + "\"",
            "\"" + (r.event_date || "") + "\""
        ];
        csvRows.push(values.join(','));
    });
    
    var csvString = csvRows.join('\n');
    var blob = new Blob([csvString], { type: 'text/csv' });
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'walkin_records.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};


