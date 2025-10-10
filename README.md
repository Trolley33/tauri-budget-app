### What?
Tiny budgeting app build in Tauri, works on both Android and Windows (no iOS or MacOS testing)

#### Features
- Recurring expenses with different repeat intervals (weekly, monthly, yearly)
- Income tracking
  - Define total monthly take-home-pay and how much you personally keep (the rest is expected to be deposited)
  - Automatically shifts expected payday based on if the date inputted falls on the weekend (public holidays not implemented, but would be nice!)
- Forecasting
  - Based on some initial value, simulate expenses and incomes for any arbitrary time period
  - Override current balance to keep in sync with reality
  - View the outgoing/incoming money on any date

### Why?
My wife and I share a bank account for our main joint expenses; I used to have a super complicated spreadsheet for forecasting how much money we should have, and every year I had to make a new sheet and update all the formulas.

I realised that I am a programmer, and I can just make an app that does exactly what I want it to do.

### Disclaimer
If you use this to track your own budget, don't expect anything other than exactly what is described above; there's no spending insights, no recomendations, and everything is offline stored right on the device you are using.
For me - this is perfect, for you it might not be, and if you lose all your data since it wasn't backed up in the cloud that's on you! If you want to build some cloud synching, feel free to fork this repo.

### Contributing
If you have some neat idea, or find an issue - please raise an issue and preferably a PR. If it aligns with my intentions for this mini-project I'll merge it, otherwise again you are free to fork and do whatever you want with the code.