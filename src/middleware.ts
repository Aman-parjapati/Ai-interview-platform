import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";


const isPublicRoute = createRouteMatcher([
"/",
"/sign-in(.*)",
"/sign-up(.*)",
"/interview(.*)",
"/call(.*)",
"/api/register-call(.*)",
"/api/get-call(.*)",
"/api/generate-interview-questions(.*)",
"/api/create-interviewer(.*)",
"/api/analyze-communication(.*)",
]);


export default clerkMiddleware((auth, req) => {
if (!isPublicRoute(req)) {
auth().protect();
}
});

export const config = {
matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
