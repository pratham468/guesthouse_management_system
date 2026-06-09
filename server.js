const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const { sql, connectDB } = require('./db');

const app = express();
const PORT = 3000;

connectDB();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));


//HOME 
app.get('/', (req, res) => {
    res.redirect('/login.html');
});


// LOGIN
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await sql.query`
            SELECT * FROM Employees
            WHERE email = ${email} AND password = ${password}
        `;

        if (result.recordset.length > 0) {
            res.json({ success: true, user: result.recordset[0] });
        } else {
            res.json({ success: false, message: 'Invalid email or password' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


// SIGNUP 
app.post('/signup', async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        await sql.query`
            INSERT INTO Employees (name, email, password, role)
            VALUES (${name}, ${email}, ${password}, ${role})
        `;

        res.json({ success: true, message: 'Account created successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Email already exists' });
    }
});


// ROOM REQUEST 
app.post('/room-request', async (req, res) => {
    const {
        employee_id, check_in, check_out, reason,
        guesthouse, room_type, ac_type
    } = req.body;

    try {
        await sql.query`
            INSERT INTO RoomRequests 
            (employee_id, check_in, check_out, reason, guesthouse, room_type, ac_type)
            VALUES 
            (${employee_id}, ${check_in}, ${check_out}, ${reason}, ${guesthouse}, ${room_type}, ${ac_type})
        `;

        res.json({ success: true, message: 'Request submitted successfully' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET ALL REQUESTS 
app.get('/requests', async (req, res) => {
    try {
        const result = await sql.query`
            SELECT RoomRequests.*, Employees.name
            FROM RoomRequests
            JOIN Employees ON RoomRequests.employee_id = Employees.id
            ORDER BY RoomRequests.id DESC
        `;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// APPROVE / REJECT 
app.post('/approve-request', async (req, res) => {
    const { request_id, room_number, status } = req.body;

    try {
        if (status === 'Approved') {
            await sql.query`
                UPDATE RoomRequests
                SET status = ${status}, room_number = ${room_number}
                WHERE id = ${request_id}
            `;

            await sql.query`
                UPDATE Rooms
                SET status = 'Occupied'
                WHERE room_number = ${room_number}
            `;
        } else {
            await sql.query`
                UPDATE RoomRequests
                SET status = ${status}, room_number = NULL
                WHERE id = ${request_id}
            `;
        }

        res.json({ success: true, message: 'Request updated successfully' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// GET MEAL SCHEDULE 
app.get('/meal-schedule', async (req, res) => {
    try {
        const result = await sql.query`
            SELECT * FROM MealSchedule ORDER BY id DESC
        `;
        res.json(result.recordset[0]); // latest record
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// UPDATE MEAL SCHEDULE 
app.post('/update-meal', async (req, res) => {
    const { breakfast, lunch, dinner,
            breakfast_price, lunch_price, dinner_price } = req.body;

    try {
        await sql.query`
            INSERT INTO MealSchedule 
            (meal_date, breakfast, lunch, dinner, breakfast_price, lunch_price, dinner_price)
            VALUES 
            (CAST(GETDATE() AS DATE), ${breakfast}, ${lunch}, ${dinner},
             ${breakfast_price}, ${lunch_price}, ${dinner_price})
        `;

        res.json({ success: true, message: 'Meal updated for today' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/room-stats', async (req, res) => {
    try {
        const total = await sql.query`SELECT COUNT(*) as total FROM Rooms`;
        const available = await sql.query`SELECT COUNT(*) as available FROM Rooms WHERE status='Available'`;
        const occupied = await sql.query`SELECT COUNT(*) as occupied FROM Rooms WHERE status='Occupied'`;

        res.json({
            total: total.recordset[0].total,
            available: available.recordset[0].available,
            occupied: occupied.recordset[0].occupied
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/my-requests/:id', async (req, res) => {
    const id = req.params.id;

    try {
        const result = await sql.query`
            SELECT * FROM RoomRequests
            WHERE employee_id = ${id}
            ORDER BY id DESC
        `;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/available-rooms', async (req, res) => {
    const { guesthouse, room_type, ac_type } = req.query;

    console.log("Filters:", guesthouse, room_type, ac_type);

    try {
        const result = await sql.query`
            SELECT * FROM Rooms
            WHERE status = 'Available'
            AND guesthouse = ${guesthouse}
            AND room_type = ${room_type}
            AND ac_type = ${ac_type}
        `;

        console.log("Rooms found:", result.recordset);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/add-guest', async (req, res) => {
    const {
        guest_name, check_in, check_out,
        reason, room_type, ac_type,
        guesthouse, room_number
    } = req.body;

    try {
        // Insert booking
        await sql.query`
            INSERT INTO GuestBookings
            (guest_name, check_in, check_out, reason, room_type, ac_type, guesthouse, room_number)
            VALUES
            (${guest_name}, ${check_in}, ${check_out}, ${reason}, ${room_type}, ${ac_type}, ${guesthouse}, ${room_number})
        `;

        // Update room status
        await sql.query`
            UPDATE Rooms
            SET status = 'Occupied'
            WHERE room_number = ${room_number}
        `;

        res.json({ success: true, message: 'Guest booked successfully' });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/checkout', async (req, res) => {
    const { room_number } = req.body;

    try {
        await sql.query`
            UPDATE Rooms
            SET status = 'Available'
            WHERE room_number = ${room_number}
        `;

        res.json({ success: true, message: 'Room released' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/occupied-rooms', async (req, res) => {
    try {
        const result = await sql.query`
            SELECT 
                r.room_number,
                r.guesthouse,
                r.room_type,
                r.ac_type,
                g.guest_name,
                g.check_in,
                g.check_out,
                'Guest' AS type
            FROM Rooms r
            JOIN GuestBookings g ON r.room_number = g.room_number
            WHERE g.booking_status = 'Active'

            UNION

            SELECT 
                r.room_number,
                r.guesthouse,
                r.room_type,
                r.ac_type,
                e.name AS guest_name,
                rr.check_in,
                rr.check_out,
                'Employee' AS type
            FROM Rooms r
            JOIN RoomRequests rr ON r.room_number = rr.room_number
            JOIN Employees e ON rr.employee_id = e.id
            WHERE rr.status = 'Approved'
            AND rr.booking_status = 'Active'
        `;

        res.json(result.recordset);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/room-history', async (req, res) => {
    try {
        const result = await sql.query`
            SELECT 
                r.room_number,
                r.guesthouse,
                r.room_type,
                r.ac_type,
                g.guest_name,
                g.check_in,
                g.check_out,
                'Guest' AS type
            FROM Rooms r
            JOIN GuestBookings g ON r.room_number = g.room_number
            WHERE g.booking_status = 'Completed'

            UNION

            SELECT 
                r.room_number,
                r.guesthouse,
                r.room_type,
                r.ac_type,
                e.name AS guest_name,
                rr.check_in,
                rr.check_out,
                'Employee' AS type
            FROM Rooms r
            JOIN RoomRequests rr ON r.room_number = rr.room_number
            JOIN Employees e ON rr.employee_id = e.id
            WHERE rr.booking_status = 'Completed'
        `;

        res.json(result.recordset);

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/employee-billing/:id', async (req, res) => {
    const id = req.params.id;

    try {
        const stay = await sql.query`
            SELECT rr.check_in, rr.room_number, r.price
            FROM RoomRequests rr
            JOIN Rooms r ON rr.room_number = r.room_number
            WHERE rr.employee_id = ${id}
            AND rr.status = 'Approved'
            AND rr.booking_status = 'Active'
        `;

        if (stay.recordset.length === 0) {
            return res.json({ message: 'No active stay found' });
        }

        const data = stay.recordset[0];
        const checkIn = new Date(data.check_in);
        const today = new Date();

        const days = Math.ceil((today - checkIn) / (1000 * 60 * 60 * 24));

        // 🔥 ROOM CHARGE
        const roomTotal = data.price * days;

        // 🔥 MEAL CHARGE
        const meals = await sql.query`
            SELECT meal_date, breakfast_price, lunch_price, dinner_price
            FROM MealSchedule
        `;

        let mealTotal = 0;

        meals.recordset.forEach(day => {
            const mealDate = new Date(day.meal_date);
            if (mealDate >= checkIn && mealDate <= today) {
                mealTotal += (
                    day.breakfast_price +
                    day.lunch_price +
                    day.dinner_price
                );
            }
        });

        res.json({
            total_days: days,
            room_charge: roomTotal,
            meal_charge: mealTotal,
            total_bill: roomTotal + mealTotal
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/all-billing', async (req, res) => {
    try {
        const today = new Date();

        const [employees, guests, meals] = await Promise.all([
            sql.query`
                SELECT rr.employee_id, e.name, rr.check_in, rr.check_out, rr.room_number, r.price
                FROM RoomRequests rr 
                JOIN Employees e ON rr.employee_id = e.id
                JOIN Rooms r ON rr.room_number = r.room_number
                WHERE rr.status = 'Approved' AND rr.booking_status = 'Active'
            `,
            sql.query`
                SELECT g.guest_name, g.check_in, g.check_out, g.room_number, r.price
                FROM GuestBookings g
                JOIN Rooms r ON g.room_number = r.room_number
                WHERE g.booking_status = 'Active'
            `,
            sql.query`
                SELECT meal_date, breakfast_price, lunch_price, dinner_price 
                FROM MealSchedule`
        ]);

        let result = [];

        const calculateBilling = (list, type) => {
            list.forEach(person => {
                const checkIn = new Date(person.check_in);

                const diffTime = Math.abs(today - checkIn);
                const daysStayed = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // 🔥 ROOM CHARGE
                const roomTotal = (person.price || 0) * daysStayed;

                // 🔥 MEAL CHARGE
                let mealTotal = 0;
                meals.recordset.forEach(day => {
                    const mealDate = new Date(day.meal_date);
                    if (mealDate >= checkIn && mealDate <= today) {
                        mealTotal += (
                            day.breakfast_price +
                            day.lunch_price +
                            day.dinner_price
                        );
                    }
                });

                result.push({
                    name: person.name || person.guest_name,
                    type: type,
                    room: person.room_number,
                    days: daysStayed,
                    roomCharge: roomTotal,
                    mealCharge: mealTotal,
                    total: roomTotal + mealTotal,
                    checkin: person.check_in,
                    checkout: person.check_out
                });
            });
        };

        calculateBilling(employees.recordset, 'Employee');
        calculateBilling(guests.recordset, 'Guest');

        res.json(result);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

//employees-billing
app.get('/my-billing/:id', async (req, res) => {
    const id = req.params.id;

    try {
        const today = new Date();

        const emp = await sql.query`
            SELECT rr.check_in, rr.room_number, e.name, r.price
            FROM RoomRequests rr
            JOIN Employees e ON rr.employee_id = e.id
            JOIN Rooms r ON rr.room_number = r.room_number
            WHERE rr.employee_id = ${id}
            AND rr.status = 'Approved'
            AND rr.booking_status = 'Active'
        `;

        if (emp.recordset.length === 0) {
            return res.json({ message: 'No active stay' });
        }

        const data = emp.recordset[0];
        const checkIn = new Date(data.check_in);

        const days = Math.ceil(
            (today - checkIn) / (1000 * 60 * 60 * 24)
        );

        // 🔥 ROOM
        const roomTotal = (data.price || 0) * days;

        // 🔥 MEAL
        const meals = await sql.query`
            SELECT meal_date, breakfast_price, lunch_price, dinner_price
            FROM MealSchedule
        `;

        let mealTotal = 0;

        meals.recordset.forEach(day => {
            const mealDate = new Date(day.meal_date);
            if (mealDate >= checkIn && mealDate <= today) {
                mealTotal += (
                    day.breakfast_price +
                    day.lunch_price +
                    day.dinner_price
                );
            }
        });

        res.json({
            name: data.name,
            room: data.room_number,
            days,
            roomCharge: roomTotal,
            mealCharge: mealTotal,
            total: roomTotal + mealTotal
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/meal-history', async (req, res) => {
    try {
        const result = await sql.query`
            SELECT meal_date, breakfast, lunch, dinner,
                   breakfast_price, lunch_price, dinner_price
            FROM MealSchedule
            WHERE meal_date IS NOT NULL
            ORDER BY meal_date DESC
        `;

        res.json(result.recordset);

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
});

cron.schedule('0 0 * * *', async () => {
    console.log('Running auto checkout...');

    try {
        //Mark guest bookings completed
        await sql.query`
            UPDATE GuestBookings
            SET booking_status = 'Completed'
            WHERE check_out < CAST(GETDATE() AS DATE)
        `;

        //Mark employee bookings completed
        await sql.query`
            UPDATE RoomRequests
            SET booking_status = 'Completed'
            WHERE check_out < CAST(GETDATE() AS DATE)
            AND status = 'Approved'
        `;

        // 3. Free rooms
        await sql.query`
            UPDATE Rooms
            SET status = 'Available'
            WHERE room_number IN (
                SELECT room_number FROM GuestBookings
                WHERE booking_status = 'Completed'
            )
        `;

        await sql.query`
            UPDATE Rooms
            SET status = 'Available'
            WHERE room_number IN (
                SELECT room_number FROM RoomRequests
                WHERE booking_status = 'Completed'
            )
        `;

        console.log('Auto checkout completed');

    } catch (err) {
        console.log('Error:', err);
    }
});

//maintenance request
app.post('/maintenance-request', async (req, res) => {
    const { employee_id, issue } = req.body;

    try {
        // Get employee room info
        const emp = await sql.query`
            SELECT room_number, guesthouse
            FROM RoomRequests
            WHERE employee_id = ${employee_id}
            AND status = 'Approved'
        `;

        const data = emp.recordset[0];

        await sql.query`
            INSERT INTO MaintenanceRequests 
            (employee_id, room_number, guesthouse, issue)
            VALUES (
                ${employee_id},
                ${data.room_number},
                ${data.guesthouse},
                ${issue}
            )
        `;

        res.json({ message: 'Request submitted' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//maintanenece-manager
// GET
app.get('/maintenance', async (req, res) => {
    const result = await sql.query`SELECT * FROM MaintenanceRequests ORDER BY id DESC`;
    res.json(result.recordset);
});

// UPDATE
app.post('/update-maintenance', async (req, res) => {
    const { id, status } = req.body;

    try {
        await sql.query`
            UPDATE MaintenanceRequests
            SET status = ${status}
            WHERE id = ${id}
        `;

        res.json({ message: 'Updated' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/my-maintenance/:id', async (req, res) => {
    const id = req.params.id;

    try {
        const result = await sql.query`
            SELECT * FROM MaintenanceRequests
            WHERE employee_id = ${id}
            ORDER BY id DESC
        `;

        res.json(result.recordset);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//show rates of room
app.get('/room-rates', async (req, res) => {
    try {
        const result = await sql.query`SELECT * FROM RoomRates`;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});
app.get('/rooms', async (req, res) => {
    try {
        const result = await sql.query`SELECT * FROM Rooms`;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/food-rates', async (req, res) => {
    try {
        const result = await sql.query`SELECT * FROM FoodRates`;
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

// START SERVER 
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});