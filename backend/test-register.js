const http = require("http");

const data = JSON.stringify({
  email: "charannaik734@gmail.com",
  password: "Charan1234",
  fullName: "Charan Nayak",
});

const options = {
  hostname: "localhost",
  port: 5000,
  path: "/api/auth/register",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data),
  },
};

const req = http.request(options, (res) => {
  let body = "";
  res.on("data", (chunk) => (body += chunk));
  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log("Response:", JSON.parse(body));
  });
});

req.on("error", (e) => console.error("Error:", e.message));
req.write(data);
req.end();
