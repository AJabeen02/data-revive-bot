# Data Refresh Initiative

I have a new dataset that must replace the old dataset currently being used by this project.

Before making any changes, inspect the entire existing project and identify exactly where the current/old dataset is being used.

Check:

Current dataset file name and location

All code files that read or reference the old dataset

Backend/API data sources

Database tables and records related to the old dataset

Dashboard components that display the old dataset

Existing preprocessing and data-processing logic

Configuration files and environment variables related to the dataset

Then inspect the newly provided dataset and compare it with the existing dataset.

Compare:

File format

Variables/columns

Data types

Date/time range

Latitude and longitude

Units

Number of records

Missing values

Dataset dimensions

Variable names

Dataset replacement

Replace the OLD dataset with the NEW dataset as the primary data source throughout the SIH project.

Update all necessary:

Dataset file paths

Data-loading code

Backend processing

Database ingestion

API endpoints

Dashboard data sources

Configuration

Preprocessing code

If the new dataset uses different variable/column names, create an appropriate mapping instead of inventing data.

Do NOT generate synthetic or fake data.

Do NOT invent missing variables or records.

Do NOT unnecessarily modify the original measurements.

Do NOT delete the old dataset immediately. Keep it as a backup until the new dataset has been successfully integrated and verified.

Verification

After integration, verify that:

The application is using the NEW dataset.

The OLD dataset is no longer used by any active code path.

Dashboard values come from the NEW dataset.

Backend/API responses use the NEW dataset.

Database records are updated appropriately.

Existing functionality continues to work.

No fake or synthetic data has been introduced.

The project builds successfully.

At the end, provide a report showing:

Old dataset

New dataset

Dataset differences

Files modified

Database changes

API/backend changes

Dashboard changes

Validation results

Any remaining references to the old dataset

Do not modify the other SIH modules or ML architecture unless necessary for compatibility with the new dataset.

Do not proceed with additional module development until the dataset replacement is successfully verified.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3638bf28-4ccb-469a-a644-bebf5df8e707).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
