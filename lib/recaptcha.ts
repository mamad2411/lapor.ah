export async function verifyRecaptcha(token: string | null | undefined) {
  if (process.env.NODE_ENV === "development" && !token) {
    return true;
  }

  if (!token) {
    throw new Error("reCAPTCHA token is missing");
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    console.warn("RECAPTCHA_SECRET_KEY is not set. Skipping verification.");
    return true;
  }

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${secret}&response=${token}`,
  });

  const data = await res.json();
  return data.success;
}
