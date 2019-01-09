import jwt from "jsonwebtoken";
import User from "../models/user";
import secret from "../config/secret";

const authenticate = requiredRoles => {
  return (
    authenticate[requiredRoles] ||
    (authenticate[requiredRoles] = (req, res, next) => {
      const authHeader = req.get("Authorization");
      if (!authHeader)
        return res.status(401).send("401 Unauthorized: Missing token");

      const token = authHeader.substring(7);
      jwt.verify(token, secret, (err, decoded) => {
        if (err)
          return res
            .status(401)
            .send("401 Unauthorized: Token expired or invalid");

        req.auth = decoded;
        if (!requiredRoles || requiredRoles.length === 0) return next();

        delete decoded.reset;
        delete decoded.iat;
        delete decoded.exp;
        delete decoded.group;
        delete decoded.role;

        User.findOne(decoded, (err, user) => {
          if (err) return res.status(500).end();

          if (!requiredRoles.includes(user.role)) {
            // leave it to next to see if it accesses `self`
            if (requiredRoles.includes("self")) {
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
