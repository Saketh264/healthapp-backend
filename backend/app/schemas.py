from pydantic import BaseModel, EmailStr, Field


class Signup(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)

    class Config:
        str_strip_whitespace = True


class Login(Signup):
    pass