function formatDate(dateValue) {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// UI Help
document.addEventListener("DOMContentLoaded", () => {
    const currentPage = window.location.pathname.split("/").pop();
    const links = document.querySelectorAll(".nav-links a");
    links.forEach(link => {
        if (link.getAttribute("href") === currentPage) link.classList.add("active");
    });
});

async function login() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const msg = document.getElementById('msg');
    if (!email || !password) { msg.innerText = 'Please enter email and password'; return; }

    try {
        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success) {
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = data.user.role === 'employee' ? 'employee-dashboard.html' : 'manager-dashboard.html';
        } else { msg.innerText = data.message; }
    } catch (error) { msg.innerText = 'Something went wrong'; }
}

async function signup() {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const role = document.getElementById('role').value;
    const msg = document.getElementById('msg');

    if (!name || !email || !password) { msg.innerText = 'Please fill all fields'; return; }

    try {
        const res = await fetch('/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role })
        });
        const data = await res.json();
        if (data.success) { window.location.href = 'login.html'; } 
        else { msg.innerText = data.message; }
    } catch (error) { msg.innerText = 'Signup failed'; }
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Manager Functions (Room & Request Management)
async function loadStats() {
    try {
        const res = await fetch('/room-stats');
        const data = await res.json();
        if(document.getElementById('total')) document.getElementById('total').innerText = data.total;
        if(document.getElementById('available')) document.getElementById('available').innerText = data.available;
        if(document.getElementById('occupied')) document.getElementById('occupied').innerText = data.occupied;
    } catch (error) { console.error('Stats load failed'); }
}

async function loadRequests() {
    const container = document.getElementById('requestList');
    try {
        const res = await fetch('/requests');
        const data = await res.json();

        if (data.length === 0) {
            container.innerHTML = '<p style="padding:20px; color:var(--text-light);">No pending requests to manage.</p>';
            return;
        }

        let html = `
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Stay Details</th>
                            <th>Room Assignment</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>`;

        data.forEach(req => {
            html += `
                <tr id="request_${req.id}">
                    <td>
                        <strong>${req.name}</strong><br>
                        <small class="status-badge pending" style="margin-top:5px; display:inline-block;">${req.status}</small>
                    </td>
                    <td>
                        <div class="stay-info">
                            <span style="color:var(--text-dark); font-weight:600;">${req.guesthouse}</span><br>
                            <small>${formatDate(req.check_in)} — ${formatDate(req.check_out)}</small>
                        </div>
                    </td>
                    <td>
                        <div class="assignment-box">
                            <button class="secondary-btn sm" onclick="loadRoomsForRequest(${req.id}, '${req.guesthouse}', '${req.room_type}', '${req.ac_type}')">
                                Find Rooms
                            </button>
                            <select id="room_${req.id}" class="table-select"></select>
                        </div>
                    </td>
                    <td>
                        <div class="table-actions">
                            <button class="primary-btn sm" onclick="approveRequest(${req.id})">Approve</button>
                            <button class="logout-btn sm" style="color:#ef4444; font-size:12px; margin-top:5px;" onclick="rejectRequest(${req.id})">Reject</button>
                        </div>
                    </td>
                </tr>`;
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
        
    } catch (error) { 
        container.innerHTML = '<p class="error-msg">Error loading requests</p>'; 
    }
}

async function approveRequest(request_id) {
    const room_number = document.getElementById(`room_${request_id}`).value;
    if (!room_number || room_number === 'No rooms available') {
        alert('Select a valid room');
        return;
    }

    const res = await fetch('/approve-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            request_id,
            room_number,
            status: 'Approved'
        })
    });
    const data = await res.json();
    const actionsDiv = document.getElementById(`actions_${request_id}`);
    actionsDiv.innerHTML = `<p style="color:green;"><b>✅ Approved (Room ${room_number})</b></p>`;
}

async function rejectRequest(request_id) {
    const res = await fetch('/approve-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id, room_number: null, status: 'Rejected' })
    });
    const data = await res.json();
    const actionsDiv = document.getElementById(`actions_${request_id}`);
    actionsDiv.innerHTML = `<p style="color:red;"><b>❌ Rejected</b></p>`;

}

async function loadOccupiedRooms() {
    try {
        const res = await fetch('/occupied-rooms');
        const data = await res.json();
        let html = `<table class="data-table"><thead><tr><th>Room</th><th>Guest</th><th>Guesthouse</th><th>Stay Period</th></tr></thead><tbody>`;
        if (data.length === 0) {
            document.getElementById('roomList').innerHTML = '<p style="padding:20px">No occupied rooms</p>';
            return;
        }
        data.forEach(room => {
            html += `<tr>
                <td><strong>${room.room_number}</strong></td>
                <td>${room.guest_name} <br><small>${room.type}</small></td>
                <td>${room.guesthouse}</td>
                <td>${formatDate(room.check_in)} - ${formatDate(room.check_out)}</td>
            </tr>`;
        });
        document.getElementById('roomList').innerHTML = html + '</tbody></table>';
    } catch (error) { document.getElementById('roomList').innerHTML = 'Error loading occupied rooms'; }
}

async function addGuest() {
    const payload = {
        name: document.getElementById('guest_name').value,
        type: document.getElementById('guest_type').value,
        check_in: document.getElementById('check_in').value,
        check_out: document.getElementById('check_out').value,
        room_number: document.getElementById('room_number').value
    };
    const res = await fetch('/add-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    alert(data.message);
}

async function updateMeal() {
    const payload = {
        breakfast: document.getElementById('breakfast').value,
        lunch: document.getElementById('lunch').value,
        dinner: document.getElementById('dinner').value,
        breakfast_price: document.getElementById('breakfast_price').value,
        lunch_price: document.getElementById('lunch_price').value,
        dinner_price: document.getElementById('dinner_price').value
    };
    const res = await fetch('/update-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    document.getElementById('msg').innerText = data.message;
}

async function loadMealSchedule() {
    try {
        const res = await fetch('/meal-schedule');
        const data = await res.json();
        const types = ['breakfast', 'lunch', 'dinner'];

        types.forEach(type => {
            const priceEl = document.getElementById(`${type}_price`);
            if (!priceEl) return;

            // If it's an input (Manager View), set .value; otherwise (Employee View), set .innerText
            if (priceEl.tagName === 'INPUT') {
                document.getElementById(type).value = data[type];
                priceEl.value = data[`${type}_price`];
            } else {
                document.getElementById(`${type}_desc`).innerText = data[type];
                priceEl.innerText = `₹${data[`${type}_price`]}`;
            }
        });
    } catch (error) {
        console.error('Failed to load meals:', error);
    }
}

// Employee Dashboard 
async function submitRequest() {
    const user = JSON.parse(localStorage.getItem('user'));
    const payload = {
        employee_id: user.id,
        check_in: document.getElementById('check_in').value,
        check_out: document.getElementById('check_out').value,
        reason: document.getElementById('reason').value,
        guesthouse: document.getElementById('guesthouse').value,
        room_type: document.getElementById('room_type').value,
        ac_type: document.getElementById('ac_type').value
    };
    const res = await fetch('/room-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    document.getElementById('msg').innerText = data.message;
}

async function loadMyRequests() {
    const user = JSON.parse(localStorage.getItem('user'));
    const container = document.getElementById('requestList');

    try {
        const res = await fetch(`/my-requests/${user.id}`);
        const data = await res.json();

        if (data.length === 0) {
            container.innerHTML = '<p style="padding:20px; color:var(--text-light);">You have no room requests yet.</p>';
            return;
        }

        // Added table-container wrapper to match your CSS
        let html = `
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Stay Period</th>
                            <th>Guesthouse</th>
                            <th>Room Type</th>
                            <th>Status</th>
                            <th>Room No.</th>
                        </tr>
                    </thead>
                    <tbody>`;

        data.forEach(req => {
            const statusClass = req.status.toLowerCase(); // Matches .approved, .pending, .rejected
            
            html += `
                <tr>
                    <td>${formatDate(req.check_in)} - ${formatDate(req.check_out)}</td>
                    <td><strong>${req.guesthouse}</strong></td>
                    <td>${req.room_type} (${req.ac_type})</td>
                    <td><span class="status-badge ${statusClass}">${req.status}</span></td>
                    <td><strong>${req.room_number || '--'}</strong></td>
                </tr>`;
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = '<p class="error-msg">Error loading your requests.</p>';
    }
}

async function loadAvailableRooms() {
    const g = document.getElementById('guesthouse').value;
    const rt = document.getElementById('room_type').value;
    const ac = document.getElementById('ac_type').value;
    const res = await fetch(`/available-rooms?guesthouse=${g}&room_type=${rt}&ac_type=${ac}`);
    const data = await res.json();
    document.getElementById('room_number').innerHTML = data.map(r => `<option value="${r.room_number}">${r.room_number}</option>`).join('') || '<option>No rooms</option>';
}

async function loadRoomsForRequest(id, g, rt, ac) {
    const res = await fetch(`/available-rooms?guesthouse=${g}&room_type=${rt}&ac_type=${ac}`);
    const data = await res.json();
    document.getElementById(`room_${id}`).innerHTML = data.map(r => `<option value="${r.room_number}">${r.room_number}</option>`).join('');
}

async function loadRoomHistory() {
    const container = document.getElementById('historyList');
    try {
        const res = await fetch('/room-history');
        const data = await res.json();

        if (!data || data.length === 0) {
            container.innerHTML = '<p style="padding:20px; color:var(--text-light);">No completed bookings found.</p>';
            return;
        }

        let html = `
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Room Info</th>
                            <th>Stay Period</th>
                            <th>Location</th>
                            <th>Guest/Employee</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>`;

        data.forEach(record => {
            html += `
                <tr>
                    <td>
                        <strong>Room ${record.room_number}</strong><br>
                        <small>${record.room_type} (${record.ac_type})</small>
                    </td>
                    <td>
                        <div class="stay-info">
                            ${formatDate(record.check_in)} — ${formatDate(record.check_out)}
                        </div>
                    </td>
                    <td>${record.guesthouse}</td>
                    <td>
                        <strong>${record.guest_name || record.name}</strong><br>
                    </td>
                    <td>
                        <span class="status-badge approved">Completed</span>
                    </td>
                </tr>`;
        });
        html += '</tbody></table></div>';
        container.innerHTML = html;

    } catch (error) {
        console.error('History load error:', error);
        container.innerHTML = '<p style="padding:20px; color:#ef4444;">Error loading room history.</p>';
    }
}

// 🔹 Format Date (ADD THIS AT TOP)
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-IN');
}


// ================= BILLING (OLD INPUT) =================
async function getBill() {
    const id = document.getElementById('emp_id').value;
    const resultDiv = document.getElementById('result');

    if (!id) {
        resultDiv.innerText = 'Enter employee ID';
        return;
    }

    try {
        const res = await fetch(`/employee-billing/${id}`);
        const data = await res.json();

        if (data.message) {
            resultDiv.innerText = data.message;
            return;
        }

        resultDiv.innerHTML = `
            <p><b>Total Days:</b> ${data.total_days}</p>
            <p><b>Total Bill:</b> ₹${data.total_bill}</p>
        `;

    } catch (error) {
        resultDiv.innerText = 'Error';
    }
}


// ================= MANAGER BILL LIST =================
async function loadAllBilling() {
    const res = await fetch('/all-billing');
    const data = await res.json();

    window.billingData = data;

    let html = '<div class="billing-grid">';

    data.forEach((item, index) => {
        html += `
            <div class="bill-card">
                <div class="bill-info">
                    <h4>${item.name}</h4>
                    <p>${item.type}</p>
                </div>

                <button onclick="openBillPage(${index})" class="view-btn">
                    View Bill
                </button>
            </div>
        `;
    });

    html += '</div>';

    document.getElementById('billList').innerHTML = html;
}


// ================= OPEN BILL PAGE =================
function openBillPage(index) {
    const item = window.billingData[index];

    localStorage.setItem('selectedBill', JSON.stringify(item));
    window.location.href = 'bill.html';
}


// ================= LOAD BILL PAGE =================
function loadBillPage() {
    const item = JSON.parse(localStorage.getItem('selectedBill'));

    if (!item) return;

    const today = new Date();

    // 🔥 BASIC INFO
    document.getElementById('name').innerText = item.name;
    document.getElementById('type').innerText = item.type;
    document.getElementById('room').innerText = item.room;
    document.getElementById('days').innerText = item.days;

    document.getElementById('todayDate').innerText =
        today.toLocaleDateString('en-IN');

    document.getElementById('checkin').innerText =
        item.checkin ? formatDate(item.checkin) : "N/A";

    document.getElementById('checkout').innerText =
        item.checkout ? formatDate(item.checkout) : "Active";

    // 🔥 INVOICE ID
    document.getElementById('invoiceId').innerText =
        "#INV-" + today.getFullYear() + "-" + Math.floor(Math.random() * 10000);

    // ================= 🔥 NEW BILLING LOGIC =================

    const roomAmount = item.roomCharge || 0;
    const mealAmount = item.mealCharge || 0;

    // Discount only on meals (real-world logic)
    const discount = item.type === 'Employee' ? mealAmount * 0.1 : 0;

    const subtotal = roomAmount + mealAmount - discount;

    const gst = subtotal * 0.05;

    const finalTotal = subtotal + gst;

    // ================= 🔥 DISPLAY =================

    document.getElementById('roomAmount').innerText = "₹" + roomAmount;
    document.getElementById('mealAmount').innerText = "₹" + mealAmount;

    document.getElementById('discount').innerText =
        "-₹" + discount.toFixed(0);

    document.getElementById('gst').innerText =
        "+₹" + gst.toFixed(0);

    document.getElementById('finalTotal').innerText =
        "₹" + finalTotal.toFixed(0);
}

function printBill() {
    window.print();
}

// ================= EMPLOYEE BILL =================
async function loadMyBill() {
    // 1. Get the 'user' string and convert it back into an object
    const userStorage = localStorage.getItem('user'); 
    
    if (!userStorage) {
        document.getElementById('myBill').innerHTML = "<p>User not logged in.</p>";
        return;
    }

    const userData = JSON.parse(userStorage);
    const empId = userData.id; // Extract the ID from the object

    try {
        // 2. Fetch using the extracted ID
        const response = await fetch(`/my-billing/${empId}`);
        const data = await response.json();

        const container = document.getElementById('myBill');

        if (data.message) {
            container.innerHTML = `<div class="bill-card"><h4>${data.message}</h4></div>`;
            return;
        }

        // 3. Render the card using your existing CSS classes
        container.innerHTML = `
    <div class="billing-grid" id="invoice">
        <div class="bill-card" style="grid-column: span 2; padding: 25px;">

            <div style="border-bottom: 2px solid #eee; margin-bottom: 20px; padding-bottom: 10px;">
                <h4 style="color: #c49669;">My Billing Details</h4>
            </div>

            <!-- 🔥 FLEX CONTAINER -->
            <div style="display:flex; justify-content:space-between; gap:30px; align-items:stretch;">

                <!-- LEFT SIDE -->
                <div style="flex:1;">
                    <p style="color:#888;">Name</p>
                    <h4>${data.name}</h4>

                    <p style="color:#888; margin-top:15px;">Room No</p>
                    <h4>${data.room}</h4>

                    <p style="color:#888; margin-top:15px;">Stay Duration</p>
                    <h4>${data.days} Days</h4>
                </div>

                <!-- RIGHT SIDE (FIXED BOX) -->
                <div style="
                    width:300px;
                    background:#fdf8f3;
                    padding:20px;
                    border-radius:12px;
                    border:1px dashed #c49669;
                    display:flex;
                    flex-direction:column;
                    justify-content:center;
                ">
                    <p style="color:#c49669; font-weight:bold; margin-bottom:10px;">
                        Total Bill
                    </p>

                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <span>Room Charges</span>
                        <span>₹${data.roomCharge}</span>
                    </div>

                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <span>Meal Charges</span>
                        <span>₹${data.mealCharge}</span>
                    </div>

                    <hr style="margin:10px 0;">

                    <div style="display:flex; justify-content:space-between; font-size:20px; font-weight:700; color:#c49669;">
                        <span>Total</span>
                        <span>₹${data.total}</span>
                    </div>
                </div>

            </div>

        </div>
    </div>`;
    
    } catch (error) {
        console.error("Fetch Error:", error);
        document.getElementById('myBill').innerHTML = "<p>Error connecting to server.</p>";
    }
}

async function loadMealHistory() {
    try {
        const res = await fetch('/meal-history');
        const data = await res.json();

        let html = '';

        if (data.length === 0) {
            html = '<p>No meal history available</p>';
        } else {
            data.forEach(item => {
                html += `
                    <div style="border:1px solid #ccc; padding:12px; margin:10px 0; border-radius:10px;">
                        <p><b>Date:</b> ${formatDate(item.meal_date)}</p>
                        <p><b>Breakfast:</b> ${item.breakfast} (₹${item.breakfast_price})</p>
                        <p><b>Lunch:</b> ${item.lunch} (₹${item.lunch_price})</p>
                        <p><b>Dinner:</b> ${item.dinner} (₹${item.dinner_price})</p>
                    </div>
                `;
            });
        }

        document.getElementById('mealList').innerHTML = html;

    } catch (error) {
        document.getElementById('mealList').innerText = 'Error loading meal history';
    }
}

//maintenance -employee
async function submitRequest() {
    const user = JSON.parse(localStorage.getItem('user'));
    const issue = document.getElementById('issue').value;

    if (!issue) {
        alert("Enter issue");
        return;
    }

    await fetch('/maintenance-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            employee_id: user.id,
            issue
        })
    });

    document.getElementById('msg').innerText = "Request Submitted";
}

//maintenance-employee
async function loadMyMaintenance() {
    const user = JSON.parse(localStorage.getItem('user'));

    const res = await fetch(`/my-maintenance/${user.id}`);
    const data = await res.json();

    let html = '';

    data.forEach(item => {
        html += `<p>${item.issue} - ${item.status}</p>`;
    });

    document.getElementById('maintenanceStatus').innerHTML = html;
}

//maintemnance- manager
async function loadMaintenance() {
    const res = await fetch('/maintenance');
    const data = await res.json();

    let html = '';

    data.forEach(item => {
        html += `
            <div style="border:1px solid #ccc; padding:10px; margin:10px;">
                <p><b>Room:</b> ${item.room_number}</p>
                <p><b>Guesthouse:</b> ${item.guesthouse}</p>
                <p><b>Issue:</b> ${item.issue}</p>
                <p><b>Status:</b> ${item.status}</p>

                ${
                    item.status === 'Pending'
                    ? `
                    <button class="approve-btn" onclick="updateMaintenance(${item.id}, 'Approved')">Approve</button>
                    <button class="reject-btn" onclick="updateMaintenance(${item.id}, 'Rejected')">Reject</button>
                    `
                    : `<b style="color:green;">${item.status}</b>`
                }
            </div>
        `;
    });

    document.getElementById('list').innerHTML = html;
}

async function updateMaintenance(id, status) {
    try {
        await fetch('/update-maintenance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status })
        });

        alert("Updated successfully");

        // 🔥 reload list
        loadMaintenance();

    } catch (err) {
        console.log(err);
        alert("Error updating");
    }
}

async function loadMyMaintenance() {
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user) return;

    try {
        const res = await fetch(`/my-maintenance/${user.id}`);
        const data = await res.json();

        let html = '';

        data.forEach(item => {
            html += `
                <tr>
                    <td>${item.room_number}</td>
                    <td>${item.guesthouse}</td>
                    <td>${item.issue}</td>
                    <td>
                        <span style="
                            color: ${
                                item.status === 'Approved' ? 'green' :
                                item.status === 'Rejected' ? 'red' :
                                'orange'
                            };
                            font-weight:bold;
                        ">
                            ${item.status}
                        </span>
                    </td>
                    <td>${formatDate(item.request_date)}</td>
                </tr>
            `;
        });

        document.getElementById('myMaintenanceTable').innerHTML = html;

    } catch (err) {
        console.log(err);
    }
}

//get room rates
async function loadRates() {
    const container = document.getElementById('rateBoard');

    try {
        const res = await fetch('/room-rates');
        const data = await res.json();

        let html = `
            <table>
                <tr>
                    <th>Guesthouse</th>
                    <th>Room Type</th>
                    <th>AC Type</th>
                    <th>Price</th>
                </tr>
        `;

        data.forEach(room => {
            html += `
                <tr>
                    <td>${room.guesthouse}</td>
                    <td>${room.room_type}</td>
                    <td>${room.ac_type}</td>
                    <td>₹${room.price}</td>
                </tr>
            `;
        });

        html += `</table>`;

        container.innerHTML = html;

    } catch (err) {
        container.innerHTML = "Error loading rates";
    }
}

async function loadFoodRates() {
    const container = document.getElementById('mealBoard');

    try {
        const res = await fetch('/food-rates');
        const data = await res.json();

        let breakfast = '';
        let lunch = '';
        let dinner = '';

        data.forEach(item => {
            const row = `<li>${item.item_name} - ₹${item.price}</li>`;

            if (item.meal_type === 'Breakfast') breakfast += row;
            if (item.meal_type === 'Lunch') lunch += row;
            if (item.meal_type === 'Dinner') dinner += row;
        });

        const html = `
            <div style="display:flex; gap:20px;">

                <div style="flex:1; background:white; padding:15px; border-radius:10px;">
                    <h3>Breakfast</h3>
                    <ul>${breakfast}</ul>
                </div>

                <div style="flex:1; background:white; padding:15px; border-radius:10px;">
                    <h3>Lunch</h3>
                    <ul>${lunch}</ul>
                </div>

                <div style="flex:1; background:white; padding:15px; border-radius:10px;">
                    <h3>Dinner</h3>
                    <ul>${dinner}</ul>
                </div>

            </div>
        `;

        container.innerHTML = html;

    } catch (err) {
        container.innerHTML = "Error loading food rates";
    }
}