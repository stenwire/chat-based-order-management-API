<p align="center">
  <a href="" target="blank"><img src="https://pixhive.s3.us-east-2.amazonaws.com/images/live-chat.png" width="120" alt="Nest Logo" /></a>
</p>


  <p align="center">A Chat based Order Management API</p>

---

## Requirement:
- Node & NPM
- Docker (optional)

---

## Project setup

```bash
$ git clone <repo_link>
```
```bash
$ cd into directory
```
```bash
$ create an `.env` file and copy the content of `.env.example` to the file.
```
```bash
$ update the content of the new `.env` as needed.
```

### How to start the app with Docker(recommended):

> #### Run the Make command below to build docker container and setup project:
```bash
$ make docker-build
```
```bash
$ make install
```
```bash
$ make docker-up
```
### How to start the app the native style(not recommended):
> #### Create a Postgres DB and update the Database URL in the env file
> Or check how to easily setup SQLite DB here: [click here](https://docs.nestjs.com/recipes/prisma)
```bash
$ npm install
```
```bash
$ npm run start:dev
```

> #### If you got everything right, you should be able to access the API docs here: http://localhost:3000/api/v1/docs

> #### If you got everything right, you should be able to access the web socket here: http://localhost:3000/api/v1/chat

### Interacting with the websocket:
#### TODO:
- Connection is ony available via SocketIo
- Create an admin and a normal user account
- Create an order, which automatically creates a chat room for communication
- Obtain the Order Id and respective user ID

#### Create two different sessions(admin and user) using your obtained order and user ID as shown below:

```bash
# User session:
http://localhost:3000/api/v1/chat?uid=<user_id>&oid=<order_id>
```
```bash
# Admin session:
http://localhost:3000/api/v1/chat?uid=<admin_id>&oid=<order_id>
```
If you find it difficult accessing the socket chat sessions, I have provided an HTML file in the root directory named `chat.html` load the html file in your browser, load it again in an incognito window to isolate sessions, then enter in your respective IDs.

### Screenshot of HTML file:
<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://pixhive.s3.us-east-2.amazonaws.com/images/Screenshot%202024-12-31%20202151.png" width=auto alt="Scrennshot of web page" /></a>
</p>

> ### Run the Make commands below to run test:
```bash
$ make run-test # unit tests
```
```bash
$ make run-e2e-test # e2e tests
```
> ⚠️ Find other Make commands in the Makefile located in the root directory

---

## Why did I use Docker and Makefile
The combination of **Docker** and a **Makefile** is highly effective for local development because it simplifies and standardizes the development environment and workflows:

1. **Environment Consistency**:
   - Docker ensures that the development environment is the same across all developers' machines by using containerized setups.
   - This avoids "it works on my machine" problems caused by variations in local environments.

2. **Simplified Commands**:
   - A **Makefile** abstracts complex Docker commands into simple, easy-to-remember targets (e.g., `make build`, `make run`, `make test`).
   - Developers don't need to memorize or type long Docker commands.

3. **Automation**:
   - The Makefile can automate repetitive tasks like building images, starting containers, running tests, or cleaning up resources.

4. **Efficiency**:
   - It reduces the learning curve for new developers by providing a clear set of instructions and standardized commands.
   - Tasks are streamlined, improving productivity.

5. **Integration**:
   - Docker handles dependencies, services (like databases), and runtime environments.
   - The Makefile ties these together, ensuring smooth integration during local development.

By combining Docker for environment consistency and the Makefile for automation and simplicity, the combo creates a powerful and developer-friendly setup.

## Useful links:
- If you dont use Docker, you're missing out. Learn about docker here: [Docker Docs](https://www.linkedin.com/in/stephen-nwankwo-9876b4196/)
- Learn about Makefile here: [Makefile Docs](https://www.linkedin.com/in/stephen-nwankwo-9876b4196/)

## Stay in touch

- My LinkedIn - [LinkedIn](https://www.linkedin.com/in/stephen-nwankwo-9876b4196/)

