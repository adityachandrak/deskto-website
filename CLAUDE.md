# DESKTO Website — Claude Code Guide

## Branching Strategy

| Branch  | Purpose              |
|---------|----------------------|
| `main`  | Testing / staging    |

> **Note:** No production branch exists yet. The site is still in the testing phase.

## Project Overview

DESKTO is a custom PC builder & repair shop admin dashboard + frontend website.
The admin dashboard covers 19 pages: Categories, Brands, Inventory, Orders, Repairs, PC Builds, Assembly, Upgrades, Software Services, Rentals, Deliveries, Support Tickets, Sell Used, Staff, Customers, Suppliers, Coupons, and Gaming Hub.

## Infrastructure

| Resource          | Details                       |
|-------------------|-------------------------------|
| Region            | ap-south-1 (Mumbai)           |
| Frontend host     | www.deskto.in (static site)   |
| EC2 instance      | i-0b652e38103c7635a (t2.micro)|
| RDS PostgreSQL    | deskto-website-postgres        |
| RDS instance ID   | deskto-website-postgres        |
| DB name           | deskto_db                     |
| DB user           | deskto_admin                  |

## Architecture

- **Frontend**: React (Vite) → built & deployed to S3 + CloudFront
- **Backend API**: Node.js/Express → runs on EC2 via systemd
- **Database**: PostgreSQL on RDS

## Key Paths

- `src/app/` — React frontend source
- `backend.js` — Node.js/Express backend
- `schema.sql` — Database schema

## CI/CD

GitHub Actions with AWS OIDC (no long-lived access keys):
- Role: `GitHubActionsDeployRole`
- AWS account: `ap-south-1`

## Default Credentials (Dev)

| Role    | Email                | Password |
|---------|----------------------|----------|
| Admin   | admin@deskto.com     | admin123 |
| Staff   | sales@deskto.com     | admin123 |
| Support | support@deskto.com   | admin123 |
| Customer| test4@gmail.com      | admin123 |

## Contact Info

- Shop: DESKTO, Shop No. 22, Arvind Nagar, Gwalior, MP 474004
- Phone: +91 62604 69111
- Email: support@deskto.in
