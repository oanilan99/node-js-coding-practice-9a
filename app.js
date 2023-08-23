const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());
const dbpath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/...");
    });
  } catch (e) {
    console.log(`DB Error: '${e.message}'`);
    process.exit(1);
  }
};
initializeDBAndServer();

//creates new user
app.post("/register", async (request, response) => {
  let { username, name, password, gender, location } = request.body;
  let hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `
    SELECT
    *
    FROM
    user
    WHERE
    username = '${username}';`;
  const userQuery = await db.get(selectUserQuery);

  if (userQuery === undefined) {
    const createUserQuery = `
        INSERT INTO
            user (username, name, password, gender, location)
        VALUES(
            '${username}',
            '${name}',
            '${hashedPassword}',
            '${gender}',
            '${location}'
        );`;
    if (password.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      await db.run(createUserQuery);
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//API 2: user login
app.post("/login", async (request, response) => {
  let { username, name, password, gender, location } = request.body;
  const checkUserQuery = `
    SELECT 
    *
    FROM
    user
    WHERE
    username = '${username}';`;
  const userQuery = await db.get(checkUserQuery);

  if (userQuery === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      userQuery.password
    );
    if (isPasswordMatched === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//API 3: changes user password
app.put("/change-password", async (request, response) => {
  let { username, oldPassword, newPassword } = request.body;
  const checkUserQuery = `
    SELECT
    *
    FROM
    user
    WHERE
    username = '${username}';`;
  const userQuery = await db.get(checkUserQuery);

  //first we have to check whether user is exists or not
  if (userQuery === undefined) {
    //user not registered
    response.status(400);
    response.send("User not registered");
  } else {
    const isValidPassword = await bcrypt.compare(
      oldPassword,
      userQuery.password
    );
    if (isValidPassword === true) {
      //password is valid(matched)
      if (newPassword.length < 5) {
        //password is too short
        response.status(400);
        response.send("Password is too short");
      } else {
        //updates new password
        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        const updatePassword = `
              UPDATE
              user
              SET
              password = '${newHashedPassword}'
              WHERE
              username = '${username}';`;

        await db.run(updatePassword); //updates the password in body
        response.status(200);
        response.send("Password updated");
      }
    } else {
      //invalid password
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
