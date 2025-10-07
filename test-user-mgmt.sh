#!/bin/bash

# Test User Management Features

echo "=== Testing User Management Endpoints ==="
echo ""

# Login as admin (owner)
echo "1. Logging in as lilistrocel (owner)..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"lilistrocel","password":"lilistrocel"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Logged in successfully"
echo "Token: ${TOKEN:0:20}..."
echo ""

# Get organization members
echo "2. Getting organization members..."
MEMBERS=$(curl -s -X GET http://localhost:3000/api/v1/organization/members \
  -H "Authorization: Bearer $TOKEN")
echo "Members: $MEMBERS"
echo ""

# Create new user with temp password
echo "3. Creating new user with temporary password..."
CREATE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/organization/create-user \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"testadmin123","email":"testadmin123@example.com","full_name":"Test Admin User"}')

echo "Create Response: $CREATE_RESPONSE"
TEMP_PASSWORD=$(echo $CREATE_RESPONSE | grep -o '"temporary_password":"[^"]*"' | cut -d'"' -f4)
echo "Temporary Password: $TEMP_PASSWORD"
echo ""

# Login with temp password
if [ ! -z "$TEMP_PASSWORD" ]; then
  echo "4. Testing login with temporary password..."
  TEMP_LOGIN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"testadmin123\",\"password\":\"$TEMP_PASSWORD\"}")

  echo "Temp Login Response: $TEMP_LOGIN"
  FORCE_PASSWORD_CHANGE=$(echo $TEMP_LOGIN | grep -o '"force_password_change":[^,}]*' | cut -d':' -f2)
  echo "Force Password Change: $FORCE_PASSWORD_CHANGE"
  echo ""
fi

echo "=== Test Complete ==="
