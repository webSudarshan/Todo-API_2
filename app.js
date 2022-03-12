const express = require("express");
const sqlite3 = require("sqlite3");
const path = require("path");
const { open } = require("sqlite");
const { format } = require("date-fns");
const isValid = require("date-fns/isValid");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");
let db;

const intializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(e.message);
    process.exit(1);
  }
};

intializeDbAndServer();

app.get("/todos/", async (request, response) => {
  const {
    status = "",
    priority = "",
    category = "",
    search_q = "",
  } = request.query;

  if (!["TO DO", "IN PROGRESS", "DONE", ""].includes(status)) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (!["LOW", "MEDIUM", "HIGH", ""].includes(priority)) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (!["WORK", "HOME", "LEARNING", ""].includes(category)) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else {
    const getTodosQuery = `
    SELECT 
    id, todo, priority, category, status, due_date AS dueDate
    FROM todo
    WHERE todo LIKE '%${search_q}%'
    AND status LIKE '%${status}%'
    AND priority LIKE '%${priority}%'
    AND category LIKE '%${category}%'`;

    const todoList = await db.all(getTodosQuery);
    response.send(todoList);
  }
});

//GET todo based on Id API
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    SELECT 
    id, todo, priority, category, status, due_date AS dueDate
    FROM todo
    WHERE id = ${todoId};`;

  const todo = await db.get(getTodoQuery);
  response.send(todo);
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  let newDate = new Date(date);
  if (newDate == "Invalid Date") {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    newDate = format(newDate, "yyyy-MM-dd");
    const getTodoQuery = `
    SELECT 
    id, todo, priority, category, status, due_date AS dueDate
    FROM todo
    WHERE due_date = '${newDate}';`;

    const todo = await db.all(getTodoQuery);
    response.send(todo);
  }
});

//POST todo API
app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  let newDate = new Date(dueDate);
  if (!["TO DO", "IN PROGRESS", "DONE"].includes(status)) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (!["LOW", "MEDIUM", "HIGH"].includes(priority)) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (!["WORK", "HOME", "LEARNING"].includes(category)) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else {
    if (newDate == "Invalid Date") {
      response.status(400);
      response.send("Invalid Due Date");
    } else {
      newDate = format(newDate, "yyyy-MM-dd");
      const addTodoQuery = `
        INSERT INTO todo
        (id, todo, priority, status, category, due_date)
        VALUES
        (
            ${id},
            '${todo}',
            '${priority}',
            '${status}',
            '${category}',
            '${newDate}'
        );`;

      await db.run(addTodoQuery);
      response.send("Todo Successfully Added");
    }
  }
});

//PUT todo API
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let column = null;
  let responseText = null;

  const key = Object.keys(request.body)[0];
  const value = request.body[key];

  if (key === "status") {
    if (!["TO DO", "IN PROGRESS", "DONE"].includes(value)) {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    }
    column = "status";
    responseText = "Status Updated";
  } else if (key === "priority") {
    if (!["LOW", "MEDIUM", "HIGH"].includes(value)) {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
    column = "priority";
    responseText = "Priority Updated";
  } else if (key === "todo") {
    column = "todo";
    responseText = "Todo Updated";
  } else if (key === "category") {
    if (!["WORK", "HOME", "LEARNING"].includes(value)) {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    }
    column = "category";
    responseText = "Category Updated";
  } else if (key === "dueDate") {
    let newDate = new Date(value);
    if (newDate == "Invalid Date") {
      response.status(400);
      response.send("Invalid Due Date");
      return;
    }
    column = "due_date";
    responseText = "Due Date Updated";
  }

  const updateTodoQuery = `
  UPDATE todo
  SET ${column} = '${value}'
  WHERE id = ${todoId};`;

  await db.run(updateTodoQuery);
  response.send(responseText);
});

//DELETE todo API
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  const deleteTodoQuery = `
    DELETE FROM todo
    WHERE id = ${todoId};`;

  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
