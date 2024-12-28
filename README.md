# RMA Working Days Calculator

A web-based calculator for processing timeframes under the Resource Management Act 1991 (RMA) in New Zealand. This tool helps planners and consent processors accurately track statutory working days, accounting for excluded time periods, extensions, and non-working days.

## Features

The calculator provides several key functionalities:

- **Multiple Application Types**: Supports different consent types with varying statutory timeframes:
  - Standard (Non-Notified) — 20 working days
  - Fast-Track — 10 working days
  - Limited Notified — 100 working days
  - Publicly Notified — 130 working days

- **Smart Date Handling**: Automatically excludes non-working days from 2022-2030 including:
  - Weekends
  - Public holidays
  - The statutory holiday period (20 December – 10 January)

- **Excluded Time Periods**: Tracks various statutory clock stoppages under s88B of the RMA:
  - Written Approvals (s88E)
  - Deposit Payment (s88H)
  - Additional Consents (s91)
  - Notified Application Suspension (s91A)
  - Non-Notified Application Suspension (s91D)
  - Information Requests (s92)

- **Extension Management**: Supports multiple extensions of time under s37

## Technical Details

Built using:
- React with TypeScript
- Tailwind CSS for styling
- shadcn/ui component library
- date-fns for date calculations
- PapaParse for CSV processing

## Local Development

To run this project locally:

1. **Clone the repository**:

   ```bash
   git clone https://github.com/kinnoda-akl/RMA-working-day-calculator.git

2. **Install dependencies**:

cd RMA-working-day-calculator
npm install

3. **Start the development server**:

npm run dev

## License

This project is licensed under the Mozilla Public License 2.0. See the LICENSE file for details.

## Contributing

We welcome contributions to improve the calculator. Please read our contribution guidelines before submitting pull requests.

## About

Developed by CoLab Planning Limited to assist with resource consent processing. The calculator aims to provide accurate timeframe calculations while considering all relevant sections of the RMA and associated regulations.

## Acknowledgments

This tool was developed in response to the need for accurate statutory timeframe tracking in resource consent processing. It incorporates feedback from planning professionals and follows best practices established by the [Ministry for the Environment]([url](https://environment.govt.nz/)).
