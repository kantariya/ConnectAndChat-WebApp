import User from '../models/User.model.js';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/generateToken.js';

export const registerUser = async (req, res) => {
  const { name, username, email, password } = req.body;

  if(!username || !email ) 
    res.status(400).json({ message:"Username and Email are required"});
  
  if(!password) 
    res.status(400).json({ message:"Password is required"});

  const userExists = await User.findOne({ $or: [{ email }, { username }] });
  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    username,
    email,
    password: hashedPassword,
  });

  if (user) {
    const token = generateToken(user._id);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, 
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
    });
  } else {
    res.status(400).json({ message: 'Invalid user data' });
  }
};

export const loginUser = async (req, res) => {
  const { emailOrUsername, password } = req.body;

  if(!emailOrUsername ) 
    res.status(400).json({ message:"Username Or Email required"});
  
  if(!password) 
    res.status(400).json({ message:"Password is required"});

  const user = await User.findOne({
    $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
  });

  if (user && (await bcrypt.compare(password, user.password))) {
    const token = generateToken(user._id);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
};

export const logoutUser = async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  res.status(200).json({ message: 'Logged out successfully' });
};
