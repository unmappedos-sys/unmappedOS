import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GithubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import { supabase } from '@/lib/supabase';

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Email/Password authentication
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: "Email", type: "email", placeholder: "operative@unmappedos.com" },
        name: { label: "Name", type: "text", placeholder: "Field Operative" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        // Create or get user from Supabase
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('email', credentials.email)
          .single();

        if (existingUser) {
          return {
            id: existingUser.id,
            email: existingUser.email,
            name: credentials.name || existingUser.email.split('@')[0],
          };
        }

        // Create new user
        const { data: newUser, error } = await supabase
          .from('users')
          .insert({
            email: credentials.email,
            provider: 'credentials',
          })
          .select()
          .single();

        if (error || !newUser) {
          console.error('Failed to create user:', error);
          return null;
        }

        return {
          id: newUser.id,
          email: newUser.email,
          name: credentials.name || newUser.email.split('@')[0],
        };
      },
    }),
    // OAuth providers (optional)
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [
          GithubProvider({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET,
          }),
        ]
      : []),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (user.email) {
        // Upsert user to Supabase
        const { error } = await supabase.from('users').upsert(
          {
            email: user.email,
            provider: account?.provider || 'email',
          },
          { onConflict: 'email' }
        );

        if (error) {
          console.error('Failed to sync user to Supabase:', error);
          return false;
        }
      }
      return true;
    },
    async session({ session, token, user }) {
      if (session.user) {
        // Get user ID from token (credentials) or fetch from Supabase (OAuth)
        if (token.sub) {
          session.user.id = token.sub;
        } else if (session.user.email) {
          const { data } = await supabase
            .from('users')
            .select('id')
            .eq('email', session.user.email)
            .single();

          if (data) {
            session.user.id = data.id;
          }
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      // Store user ID in token for credentials provider
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
