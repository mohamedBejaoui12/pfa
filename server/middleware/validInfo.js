module.exports = (req, res, next) => {
  const { cin, member_etat, email, name, password } = req.body;

  function validEmail(userEmail) {
    return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(userEmail);
  }

  if (req.path === "/register") {
    if (![cin, email, name, password].every(Boolean)) {
      return res.status(403).json("Missing Credentials");
    } else if (!validEmail(email)) {
      return res.json("Invalid Email");
    }
  } else if (req.path === "/login") {
    if (![name, password].every(Boolean)) {
      return res.status(403).json("Missing Credentials");
    } 
  }

  next();
};
