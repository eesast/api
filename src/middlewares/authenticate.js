import jwt from "jsonwebtoken";
import User from "../models/user";
import secret from "../config/secret";

/**
 * Middleware: validate user authorizations; reject if necessary
 * @param {string[]} acceptableRoles - array of acceptable roles
 */
const authenticate = acceptableRoles => {
  return (
    authenticate[acceptableRoles] ||
    (authenticate[acceptableRoles] = (req, res, next) => {
      const authHeader = req.get("Authorization");
      if (!authHeader)
        return res.status(401).send("401 Unauthorized: Missing token");

      // get token from Auth bearer header
      const token = authHeader.substring(7);
      jwt.verify(token, secret, (err, decoded) => {
        if (err)
          return res
            .status(401)
            .send("401 Unauthorized: Token expired or invalid");

        req.auth = decoded;

        // use authenticate() to accept all registered users
        if (!acceptableRoles || acceptableRoles.length === 0) return next();

        delete decoded.reset;
        delete decoded.iat;
        delete decoded.exp;
        delete decoded.group;
        delete decoded.role;

        User.findOne(decoded, (err, user) => {
          if (err) return res.status(500).end();

          if (!acceptableRoles.includes(user.role)) {
            // leave it to next() to see if it indeed accesses `self`
            if (acceptableRoles.includes("self")) {
              req.selfCheckRequired = true;
              return next();
            }

            return res.status(401).send("401 Unauthorized: Permission denied");
          }

          next();
        });
      });
    })
  );
};

export default authenticate;
