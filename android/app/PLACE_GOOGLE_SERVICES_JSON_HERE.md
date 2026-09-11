# Firebase Configuration Directory

Place your official `google-services.json` file generated from the Firebase Console in this directory:

```
c:\Projects\TerraSense\android\app\google-services.json
```

### Next Steps Once Firebase Project is Created:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create/select your Firebase project (e.g. `terrasense-alerts`)
3. Add an Android App with:
   - Package name / Application ID: `com.terrasense.alerts`
   - App nickname: `TerraSense Alerts`
4. Download `google-services.json`
5. Move `google-services.json` into `c:\Projects\TerraSense\android\app/`
6. Run `./gradlew.bat assembleDebug` — the Google Services plugin will automatically activate and bind the project credentials!
