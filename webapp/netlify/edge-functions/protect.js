export default async (request, context) => {
  const url = new URL(request.url);

  // Get the Authorization header
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return new Response("Unauthorized", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Site Under Construction"',
      },
    });
  }

  const encoded = authHeader.split(" ")[1];
  const decoded = atob(encoded);
  const [username, password] = decoded.split(":");

  // Set your desired username and password here
  const EXPECTED_USER = "admin";
  const EXPECTED_PASS = "@26Dmnot83";

  if (username === EXPECTED_USER && password === EXPECTED_PASS) {
    // Access granted, continue to the requested resource
    return context.next();
  } else {
    // Access denied
    return new Response("Unauthorized - Invalid Credentials", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Site Under Construction"',
      },
    });
  }
};
