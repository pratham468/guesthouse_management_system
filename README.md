# 🏨 Guesthouse Management System (ACW Stay)

A full-stack web application developed during internship to manage guesthouse operations such as room allocation, employee requests, meal scheduling, billing, and maintenance.

---

## 🚀 Features

### 🔐 Authentication
- User Signup & Login
- Role-based access (Manager / Employee)

---

### 🏢 Room Management
- Two guesthouses: **Lagoon** and **ABPS**
- 20 rooms per guesthouse
- Room types:
  - Single / Double
  - AC / Non-AC
- Real-time tracking:
  - Available rooms
  - Occupied rooms

---

### 📝 Room Request System
- Employees can request rooms
- Manager can:
  - Approve / Reject requests
  - Allocate rooms dynamically
- Status tracking for employees

---

### 👥 Guest Booking
- Manager can book rooms for guests
- Includes:
  - Check-in / Check-out
  - Room selection
  - Purpose of stay

---

### 🍽️ Meal Management
- Daily meal schedule
- Separate pricing for:
  - Breakfast
  - Lunch
  - Dinner
- Dynamic meal rate board

---

### 💰 Billing System
- Auto calculation based on:
  - Stay duration
  - Room charges
  - Meal charges
- Employee & Guest billing
- Professional invoice generation
- Print bill functionality

---

### 🛠️ Maintenance System
- Employees can raise maintenance requests
- Manager can approve/reject
- Status tracking available

---

### 📊 Rate Board
- Room pricing display
- Food menu with prices
- Clean structured UI

---

## 🛠️ Tech Stack

- **Frontend:** HTML, CSS, JavaScript  
- **Backend:** Node.js, Express.js  
- **Database:** Microsoft SQL Server  
- **Tools:** VS Code, SQL Server Management Studio  

---
<img width="1898" height="913" alt="image" src="https://github.com/user-attachments/assets/c2fd04cf-7ef1-4036-a0b9-ec68f0b94fc8" />


## ⚙️ Installation & Setup

### 1️⃣ Clone Repository
bash
git clone https://github.com/your-username/guesthouse-management.git
cd guesthouse-management


### 2️⃣ Install Dependencies
npm install

###3️⃣ Setup Database
Create database in SQL Server
Import tables:
Employees
Rooms
RoomRequests
GuestBookings
MealSchedule
FoodRates
RoomRates

###4️⃣ Run Server
node server.js

###5️⃣ Open in Browser
http://localhost:3000
