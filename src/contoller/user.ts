import express, { Request, Response,NextFunction} from "express";
import { User } from "../model/userdb";  
import { z } from "zod";
import { hashPassword,comparePasswords } from "../middleware/auth";


const app = express();
app.use(express.json()); /// Middleware to parse JSON

// Define signup schema using zod
const signupSchema = z.object({
  Username: z.string().min(6).max(49),
  password: z.string().min(12).max(29).regex(/[A-Z]/).regex(/[0-9]/),
  email: z.string().email("invalid email"),
  confirmPassword : z.string(),
}).refine((data)=> data.password == data.confirmPassword ,{
  message:"Password does not match",
  path:["confrimPassword"]
})

const signinSchema = z.object({
  password: z.string().min(12).max(29).regex(/[A-Z]/).regex(/[0-9]/),
  email: z.string().email(),
  confirmPassword :z.string(),
}).refine((data)=> data.password == data.confirmPassword ,{
  message:"Password does not match",
  path:["confrimPassword"]
}) 


type SignupData = z.infer<typeof signupSchema>
// Signup controller or handler

export const signupcontroller = async(req:Request,res:Response,next:NextFunction)=>{
  try{
      const SignupParse= signupSchema.safeParse(req.body);
      if(!SignupParse.success){
        return res.status(411).json({
            message :"Incorrect Input",
            error:SignupParse.error.errors
        })
       }
        const {Username ,password,email} = req.body;
        const existingUser = await User.findOne({
          email,
          password
        })
        if(existingUser){
        res.status(400).json({
            message:"User already Exict"
        })
        }
        const hashedPassword = await hashPassword(password);
        await User.create({
        Username,
        password :hashedPassword,
        email
        })
        res.status(201).json({
        message:"User Created Successfully",

        })
    }catch(e:any){
      res.status(500).json({
        message: "Server Crash",
        error: e.message

      })
      next()
    }
} 

type SigninData = z.infer<typeof signinSchema>
export const signincontroller = async (req:Request,res:Response,next:NextFunction)=>{
    try{
        const SigninParse= signinSchema.safeParse(req.body);
        if(!SigninParse.success){
          return res.status(411).json({
              message :"Incorrect Input",
              error: SigninParse.error.errors
          })
         }
          const {password,email}:SigninData = req.body;
          const user = await User.findOne({
               $or : [{email}]
          })
          if(!user){
           return res.status(400).json({
              message:"User does not exist",
              
          })
          }
          const IsPasswordValid = await comparePasswords(password, user.password as string)
          if(!IsPasswordValid){
             res.status(401).json({
                 message:"Incorrect Password",
         
              }) 
           }
         
          req.session.id = user._id as string
          req.session.loggedIn = true;
      }catch(e:any){
        res.status(500).json({
          message: "Sersver Crash",
          err: e.message
  
         })
      }
  }
 