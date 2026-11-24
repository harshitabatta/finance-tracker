# Finance Tracker 💸

A personal finance tracker designed to make managing money simpler through expense tracking, income monitoring, and monthly and yearly spending analysis.

Built to provide a straightforward overview of personal finances, spending patterns, and category-wise expenses, with a responsive interface that works across desktop and mobile devices.

## ✨ Features

- **Income & Expense Tracking:** Track money received and spent.
- **Transaction Management:** Record transaction date, type, amount, category, and optional notes.
- **Monthly Overview:** View monthly totals and understand your spending relative to income.
- **Spending Analysis:** Analyze spending patterns and spending ratios.
- **Category Breakdown:** Identify your top three spending categories, with remaining categories grouped under "Others".
- **Yearly Analysis:** Review financial activity across the calendar year, from January 1 to December 31.
- **CSV Export:** Export monthly transaction data for offline analysis or record-keeping.
- **Responsive Design:** Designed to work across desktop and mobile devices.
- **Progressive Web App (PWA):** Installable application experience for supported devices.

## 📊 Insights

The dashboard focuses on making financial data easier to understand through:

- Monthly income and expense summaries
- Spending ratio analysis
- Category-wise spending breakdown
- Yearly financial overview
- Identification of major spending categories

## 🛠️ Tech Stack

- **Frontend:** React
- **Build Tool:** Vite
- **Languages:** JavaScript, CSS, HTML
- **Backend & Database:** Supabase
- **Deployment:** Vercel
- **Application Type:** Progressive Web App (PWA)

## 🚀 Getting Started

### Prerequisites

- Node.js
- npm
- A Supabase project

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/finance-tracker.git
   ```

2. Navigate to the project directory:

   ```bash
   cd finance-tracker
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Create a `.env.local` file in the root directory.

5. Configure your Supabase environment variables:

   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_publishable_key
   ```

6. Start the development server:

   ```bash
   npm run dev
   ```

7. Open the local URL displayed in your terminal.

## 🔐 Environment Variables

The application requires Supabase configuration to connect to the backend.

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable/anonymous key |

Keep local environment files out of version control. Never commit private credentials or secrets.

## 📱 Progressive Web App

The application is configured as an installable Progressive Web App, providing an app-like experience on supported devices.

## 📌 Project Scope

The current version focuses on core personal finance tracking and spending analysis:

- Recording income and expenses
- Categorizing transactions
- Monthly financial summaries
- Yearly spending analysis
- CSV data export
- Responsive and installable interface

## 🔮 Future Improvements

Potential future enhancements include:

- Budget setting and budget alerts
- Savings goals and progress tracking
- More detailed financial visualizations
- Recurring transaction support
- Advanced filtering and search
- Personalized spending insights

## 🌐 Live Demo

[Try Finance Tracker](https://finance-tracker-nu-five-66.vercel.app/)

---

Built to make personal finance tracking simpler, more visual, and easier to maintain.
