# CoRide

**Find your ride, together.**

CoRide is a real-time ride-pooling app for students and daily commuters. Post where you're headed, instantly see who else nearby is going the same way at the same time, and pool together to split the fare.

## The Problem

Ride-hailing platforms like Namma Yatri and Uber solve rider-to-driver matching, but not rider-to-rider pooling. Students and commuters heading to the same event or place at the same time still book separate rides, coordinating through scattered WhatsApp messages instead of anything real-time. CoRide closes that gap.

## Features

- **Authentication** — Email/password sign-up and sign-in via Firebase Auth
- **Post a ride** — enter where you're leaving from, where you're headed, and pick a date & time (past dates/times disabled)
- **Live matching** — Firestore listeners group riders heading to the same destination within a close time window
- **Manual pooling** — preview potential matches, select who to pool with, and confirm
- **Fare comparison** — estimated cost comparison between a CoRide pool, a solo auto, and an Uber/cab
- **AI coordination message** — Groq generates a short message helping a confirmed pool coordinate their meetup
- **Live map** — pool members' locations and a suggested meeting point, shown via OpenStreetMap (no API key required)
- **GPS location** — captures live location via the browser's Geolocation API

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) |
| Styling | Tailwind CSS |
| Auth & Database | Firebase (Authentication + Firestore) |
| Maps | Leaflet + OpenStreetMap |
| AI | Groq API (`llama-3.1-8b-instant`) |
| Location | Browser Geolocation API |

## Setup

```bash
npm install
```

Create a `.env` file in the project root with your Firebase and Groq credentials.

Firestore Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rides/{rideId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
                    && request.resource.data.uid == request.auth.uid
                    && request.resource.data.keys().hasAll(['uid', 'name', 'from', 'destination', 'departureDate', 'departureTime', 'matched', 'createdAt'])
                    && request.resource.data.matched == false;
      allow update: if request.auth != null
                    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['matched', 'pooledWith']);
      allow delete: if request.auth != null && resource.data.uid == request.auth.uid;
    }
  }
}
```

Run:

```bash
npm run dev
```