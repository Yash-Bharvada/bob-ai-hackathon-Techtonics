import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "@/lib/mongodb"
import { connectDB } from "@/lib/mongoose"
import User from "@/lib/models/user"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(clientPromise, {
    databaseName: "voltra",
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/",
  },
  callbacks: {
    async signIn({ user }) {
      try {
        await connectDB()
        // Upsert into our custom users collection
        await User.findOneAndUpdate(
          { email: user.email },
          {
            $set: {
              name: user.name,
              image: user.image,
              provider: "google",
              lastLoginAt: new Date(),
            },
            $setOnInsert: {
              email: user.email,
              createdAt: new Date(),
            },
          },
          { upsert: true, new: true }
        )
      } catch (err) {
        console.error("[auth] signIn upsert failed:", err)
      }
      return true
    },
    async session({ session, user }) {
      // Attach the user's DB id to the session
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
  },
})
