# Blackjack API
Backend consiststing of multiple public and private routes.
## Build using:
- Typescript
- Nodejs
- ExpressJs
- SocketIO
- TypeORM
- Nodemon
## Public REST routes
### All endpoints are on /api

#### /register - POST
Request body:

    {
	    "username": string,
	    "password": string
    }
   Returns http code.
   #### /login - POST
   Request body:
   

    {
	    "username": string,
	    "password": string
    }
   Returns http code and sets jwt token in secure cookie.
   #### /rooms/ - GET
   Returns array of rooms in this format:
   

    {
	   "id": string,
	   "playerNum": number
    }[]
## Private REST routes
### All endpoints are on /api and require token from cookie set by /api/login
#### /rooms/create - POST
Returns id of new game room ( warning! user has to join in under 10 second, otherwise server deletes empty room):

    {
	    "id": string
    }
