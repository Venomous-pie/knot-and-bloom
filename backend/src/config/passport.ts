import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from '../utils/prismaUtils.js';
import { generateRandomName } from '../utils/nameGenerator.js';

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            callbackURL: process.env.GOOGLE_CALLBACK_URL || '',
            scope: ['profile', 'email'],
        },
        async (accessToken, refreshToken, profile, done) => {
            console.log("Google Strategy Initialized with Callback:", process.env.GOOGLE_CALLBACK_URL);
            try {
                const email = profile.emails?.[0]?.value;
                const googleId = profile.id;
                const name = profile.displayName;
                const avatar = profile.photos?.[0]?.value;

                if (!email) {
                    return done(new Error("No email found in Google profile"), undefined);
                }

                // Check if user exists
                let customer = await prisma.customer.findFirst({
                    where: {
                        OR: [
                            { googleId },
                            { email }
                        ]
                    }
                });

                if (customer) {
                    // Update Google ID if not set
                    if (!customer.googleId) {
                        customer = await prisma.customer.update({
                            where: { uid: customer.uid },
                            data: { googleId },
                        });
                    }
                } else {
                    // Create new user
                    customer = await prisma.customer.create({
                        data: {
                            email,
                            name: name || generateRandomName(),
                            googleId,
                            avatar: avatar || null,
                        },
                    });
                }

                return done(null, customer);
            } catch (error) {
                return done(error as Error, undefined);
            }
        }
    )
);

passport.serializeUser((user: any, done) => {
    done(null, user.uid);
});

passport.deserializeUser(async (id: number, done) => {
    try {
        const user = await prisma.customer.findUnique({ where: { uid: id } });
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

export default passport;
