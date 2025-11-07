# AppSync GraphQL API Deployment Guide

## ✅ Changes Implemented

### 1. Fixed TypeScript Error
- Updated `frontend/src/lib/amplify.ts` with proper type assertion
- Added `ResourcesConfig` type import
- Changed `defaultAuthMode: 'userPool'` to `defaultAuthMode: 'userPool' as const`

### 2. Created AppSync Infrastructure
- Created `backend/infrastructure/schema.graphql` - Complete GraphQL schema
- Created `backend/infrastructure/appsync.yml` - Serverless Framework configuration
- Set up DynamoDB data source with proper IAM roles
- Added sample resolvers for getEvent, listEvents, getCurrentUser

### 3. Created GraphQL Client Helpers
- Created `frontend/src/lib/api/graphql.ts` - GraphQL queries and mutations
- Helper functions for common operations (listEvents, getEvent, etc.)

### 4. Created Lambda Resolver
- Created `backend/services/graphql-resolver/` - Complex resolver logic
- Handles createEvent, updateEvent, registerForEvent, searchEvents

---

## 🚀 Deployment Steps

### Prerequisites
Ensure these stacks are already deployed:
- DynamoDB (dynamodb.yml)
- Cognito (cognito.yml)
- S3 (s3.yml)
- EventBridge (eventbridge.yml)
- Lambda Common Layer (layers/common)

### Step 1: Deploy GraphQL Resolver Lambda (Optional but Recommended)

```bash
cd backend/services/graphql-resolver

# Install dependencies
npm install

# Deploy the resolver
serverless deploy --stage dev
```

### Step 2: Deploy AppSync API

```bash
cd backend/infrastructure

# Deploy AppSync
serverless deploy --stage dev --config appsync.yml

# Or use the deployment script
cd ../../scripts
./deploy-appsync.sh dev
```

### Step 3: Get AppSync Configuration

```bash
# Save outputs to file
aws cloudformation describe-stacks \
  --stack-name terrapin-events-appsync-dev \
  --profile tems-dev \
  --query 'Stacks[0].Outputs' \
  > backend/appsync-outputs.json

# View outputs
cat backend/appsync-outputs.json
```

### Step 4: Update Frontend Environment Variables

Update `frontend/.env.local`:

```bash
# Get values from appsync-outputs.json
NEXT_PUBLIC_APPSYNC_URL=https://XXXXXXXXXX.appsync-api.us-east-1.amazonaws.com/graphql
NEXT_PUBLIC_APPSYNC_API_KEY=da2-XXXXXXXXXXXXXXXXXXXX
```

### Step 5: Verify TypeScript Compilation

```bash
cd frontend
npx tsc --noEmit
```

You should see no errors! ✅

### Step 6: Test Your Setup

```bash
# Start the frontend
npm run dev

# Visit http://localhost:3000
```

---

## 🧪 Testing GraphQL API

### Using AWS Console

1. Go to AWS AppSync Console
2. Select your API: `terrapin-events-appsync-dev`
3. Click "Queries" in the left menu
4. Try this sample query:

```graphql
query ListEvents {
  listEvents(limit: 10) {
    items {
      id
      title
      startDateTime
      category
    }
    nextToken
  }
}
```

### Using the Frontend API Client

Create a test component:

```typescript
// frontend/src/app/test/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { listEvents } from '@/lib/api/graphql';

export default function TestPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const result = await listEvents({ limit: 10 });
        setEvents(result.items);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Events</h1>
      <pre>{JSON.stringify(events, null, 2)}</pre>
    </div>
  );
}
```

---

## 📝 GraphQL Schema Overview

### Main Types
- **Event** - Event information with location, capacity, registration counts
- **User** - User profiles with roles
- **Registration** - Event registration with QR codes and waitlist
- **Location** - Venue details with coordinates

### Queries
- `getEvent(id: ID!)` - Get single event
- `listEvents(filter, limit, nextToken)` - List events with pagination
- `searchEvents(query: String!)` - Search events by text
- `getCurrentUser` - Get authenticated user profile
- `listMyRegistrations` - Get user's registrations

### Mutations
- `createEvent(input)` - Create new event
- `updateEvent(id, input)` - Update event
- `deleteEvent(id)` - Delete event
- `registerForEvent(eventId)` - Register for event
- `cancelRegistration(id)` - Cancel registration
- `checkInAttendee(registrationId)` - Mark attendance

### Subscriptions
- `onEventUpdate(eventId)` - Real-time event updates
- `onNewRegistration(eventId)` - Real-time registration notifications

---

## 🔧 Troubleshooting

### Issue: "ImportValue not found"

**Solution:** Deploy dependent stacks first:

```bash
cd backend/infrastructure
serverless deploy --stage dev --config dynamodb.yml
serverless deploy --stage dev --config cognito.yml
```

### Issue: "Schema file not found"

**Solution:** Ensure `schema.graphql` is in the same directory as `appsync.yml`:

```bash
ls backend/infrastructure/
# Should show: appsync.yml, schema.graphql
```

### Issue: TypeScript errors persist

**Solution:** 
1. Delete `node_modules` and reinstall:
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Restart TypeScript server in your IDE

### Issue: "User Pool not found"

**Solution:** Verify Cognito stack is deployed and exports are correct:

```bash
aws cloudformation list-exports --profile tems-dev | grep Cognito
```

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────┐
│         Frontend (Next.js)              │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │   AWS Amplify Client              │ │
│  │   - GraphQL Queries/Mutations     │ │
│  │   - Real-time Subscriptions       │ │
│  └───────────────────────────────────┘ │
└──────────────┬──────────────────────────┘
               │ HTTPS
               ↓
┌─────────────────────────────────────────┐
│      AWS AppSync (GraphQL API)          │
│                                         │
│  ┌─────────────┐    ┌──────────────┐  │
│  │  Cognito    │    │   API Key    │  │
│  │  Auth       │    │   Auth       │  │
│  └─────────────┘    └──────────────┘  │
│                                         │
│  ┌─────────────────────────────────┐  │
│  │      VTL Resolvers              │  │
│  │  - getEvent                     │  │
│  │  - listEvents                   │  │
│  │  - getCurrentUser               │  │
│  └─────────────────────────────────┘  │
└──────────┬───────────────┬──────────────┘
           │               │
           ↓               ↓
    ┌──────────┐    ┌─────────────┐
    │ DynamoDB │    │   Lambda    │
    │  Table   │    │  Resolver   │
    └──────────┘    └─────────────┘
```

---

## 🎯 Next Steps

1. ✅ Deploy AppSync infrastructure
2. ✅ Update environment variables
3. ✅ Verify TypeScript compilation
4. ⏭️ Implement additional resolvers
5. ⏭️ Add authentication flow
6. ⏭️ Create event management UI
7. ⏭️ Set up monitoring and logging

---

## 📚 Additional Resources

- [AWS AppSync Documentation](https://docs.aws.amazon.com/appsync/)
- [Serverless Framework Documentation](https://www.serverless.com/framework/docs)
- [AWS Amplify GraphQL API](https://docs.amplify.aws/gen1/javascript/build-a-backend/graphqlapi/)

---

## 🆘 Need Help?

If you encounter issues:

1. Check CloudWatch Logs for Lambda errors
2. Review AppSync resolver logs in CloudWatch
3. Verify IAM roles have correct permissions
4. Test queries in AppSync Console first

---

**Last Updated:** November 7, 2025  
**Version:** 1.0
