# Backend Architecture

## Overview

This project is a multi-tenant SaaS platform that allows service-based businesses (barbers, salons, clinics, tutors, repair shops, etc.) to manage their appointments, staff, clients, and sales through a centralized dashboard.

Customers interact with the business through WhatsApp and are redirected to a dynamic booking page where they can select services, staff, dates, and available time slots. The dashboard is used by the business to manage everything.

---

# Database Structure

## 1. Users

Stores authentication and user information.

### Fields

- id
- businessId (FK)
- name
- email
- passwordHash
- role
  - owner
  - admin
  - staff

- createdAt
- updatedAt

---

## 2. Businesses

Stores the business profile created during onboarding.

### Fields

- id
- name
- category
- phone
- address
- averageCustomers
- expectedRevenue
- plan
- status
- createdAt
- updatedAt

---

## 3. Business Settings

Stores business-wide configurations.

### Fields

- id
- businessId (FK)
- currency
- timezone
- bookingPageSlug
- bookingApprovalMode
  - automatic
  - manual

- allowClientCancel
- cancelLimitHours
- createdAt
- updatedAt

---

## 4. Staff

Stores employees.

### Fields

- id
- businessId (FK)
- name
- role
- description
- status
  - active
  - inactive

- createdAt
- updatedAt

---

## 5. Working Hours

Stores business or staff availability.

### Fields

- id
- businessId (FK)
- staffId (optional FK)
- dayOfWeek
- openTime
- closeTime
- isClosed
- createdAt
- updatedAt

---

## 6. Service Categories

Groups services.

Examples:

- Hair
- Beard
- Coloring
- Massage

### Fields

- id
- businessId (FK)
- name
- description
- createdAt
- updatedAt

---

## 7. Services

Stores all offered services.

### Fields

- id
- businessId (FK)
- categoryId (FK)
- name
- description
- durationMinutes
- price
- status
  - active
  - inactive

- createdAt
- updatedAt

---

## 8. Staff Services

Many-to-many relationship between staff and services.

One staff member can perform multiple services.

One service can be performed by multiple staff members.

### Fields

- id
- businessId (FK)
- staffId (FK)
- serviceId (FK)

---

## 9. Clients

Stores customer information.

### Fields

- id
- businessId (FK)
- name
- phone
- email
- tag
  - New
  - VIP
  - Loyal

- notes
- createdAt
- updatedAt

The following values should be calculated from appointments or sales:

- Last Visit
- Total Visits
- No-Shows

---

## 10. Appointments

Stores all bookings.

### Fields

- id
- businessId (FK)
- clientId (FK)
- serviceId (FK)
- staffId (FK)
- startTime
- endTime
- status
  - pending
  - confirmed
  - cancelled
  - completed
  - no_show

- source
  - dashboard
  - booking_page
  - whatsapp

- reminderStatus
- notes
- createdAt
- updatedAt

---

## 11. Sales

Stores completed transactions.

### Fields

- id
- businessId (FK)
- invoiceNumber
- appointmentId (optional FK)
- clientId (FK)
- serviceId (FK)
- staffId (FK)
- paymentMethod
  - cash
  - card
  - online

- status
  - paid
  - pending
  - refunded
  - cancelled

- amount
- paidAt
- createdAt
- updatedAt

---

# Relationships

Business

├── Users

├── Staff

├── Working Hours

├── Service Categories

├── Services

├── Clients

├── Appointments

├── Sales

└── Business Settings

---

Service Category

└── Services

---

Staff

└── Staff Services

---

Services

└── Staff Services

---

Client

└── Appointments

---

Appointment

└── Sales

---

# Booking Flow

```
Customer opens WhatsApp
        │
        ▼
Business replies with quick options
        │
        ▼
Customer clicks "Book Appointment"
        │
        ▼
Customer is redirected to

/book/{businessSlug}

        │
        ▼
Chooses

• Service
• Staff
• Date
• Available Time

        │
        ▼
Appointment is created

        │
        ▼
Business dashboard updates

        │
        ▼
Customer receives confirmation
```

---

# MVP Features

## Authentication

- Register
- Login
- Password hashing
- JWT authentication

---

## Dashboard

- Daily appointments
- Revenue summary
- Upcoming appointments
- Recent activity
- Quick statistics

---

## Staff Management

- Create staff
- Update staff
- Activate/Deactivate staff

---

## Services

- Categories
- Services
- Duration
- Pricing
- Assign staff

---

## Clients

- Client management
- Notes
- Tags
- Visit history

---

## Appointments

- Create booking
- Confirm
- Cancel
- Complete
- No-show

---

## Sales

- Record payments
- Invoice number
- Payment status
- Revenue reporting

---

## Booking Page

Dynamic public booking page.

```
/book/{businessSlug}
```

Customers can:

- Select service
- Select staff
- Select available date
- Select available time
- Confirm booking

---

# Future Features

These are intentionally excluded from the MVP.

## WhatsApp

- WhatsApp Cloud API integration
- Interactive reply buttons
- Interactive lists
- Booking confirmation
- Appointment reminders
- Review requests

---

## Flow Builder

Visual builder for WhatsApp conversations.

Examples:

- Welcome message
- Menu options
- Booking flow
- Support flow

---

## Automations

- Appointment reminders
- Birthday messages
- Review requests
- Rebooking reminders
- No-show recovery
- Marketing campaigns

---

## Analytics

- Revenue charts
- Customer retention
- Most booked services
- Staff performance
- Booking conversion rate

---

# Tech Stack

- Next.js
- TypeScript
- Prisma ORM
- PostgreSQL
- NextAuth/Auth.js
- Zod
- Tailwind CSS
- React Query
- WhatsApp Cloud API (future)

---

# Development Principle

Keep the MVP focused.

Build only the core business features first:

- Authentication
- Dashboard
- Staff
- Services
- Clients
- Appointments
- Sales
- Public Booking Page

Everything else (WhatsApp automation, Flow Builder, AI, marketing, analytics, subscriptions) can be added incrementally after validating the product with real businesses.
