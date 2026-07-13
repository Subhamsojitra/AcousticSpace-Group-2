# TODO - AcousticSpace integration fixes

## Backend verified
- [x] Confirm GET / returns running payload

## Frontend integration
- [ ] Wire Dashboard drag-and-drop upload to backend `POST /api/upload/` using `multipart/form-data`
- [ ] After upload, call `POST /api/analysis/` with `{ file_path }`
- [ ] After analysis, call `POST /api/predict/` with `{ file_path }`
- [ ] Replace hardcoded “Scanner Status” with real request to `GET /` (Online/Offline)
- [ ] Update UI to show success/error states

## Testing
- [ ] Verify browser Network tab shows requests and no CORS errors
- [ ] Verify backend receives file and returns expected JSON

