## Public REST routes

### All endpoints are on /api

  

#### /register - POST

Request body:

  
```javascript
{
    "username": string,
    "password": string
}
```

On success sets token and returns:
```javascript
{
    "id": number,
    "username": string,
    "balance": number
}
```

#### /login - POST

Request body:
```javascript
{
    "username": string,
    "password": string
}
```

On successful request sets token in cookie and returns:
```javascript
{
    "id": number,
    "username": string,
    "balance": number
}
```
#### /login/token - POST

Requires token set as cookie

On successful request returns:
```javascript
{
    "id": number,
    "username": string,
    "balance": number
}
```
#### /logout/ - POST
Sets cookie to expire and returns 200 code

#### /rooms/ - GET

Returns array of rooms in this format:
```javascript
{
    "id": string,
    "playerNum": number
}[]
```
## Private REST routes

### All endpoints are on /api and require token from cookie set by /api/login

#### /rooms/create - POST

Returns id of new game room ( warning! user has to join in under 10 second, otherwise server deletes empty room):
```javascript
{
    "id": string
}
```