import { auth } from "express-oauth2-jwt-bearer";

const jwtCheck = auth({
    audience: process.env.AUDIENCE as string,
    issuerBaseURL: process.env.ISSUER_BASE_URL as string,
    tokenSigningAlg: process.env.SIGNING_ALG as string
})

export default jwtCheck;