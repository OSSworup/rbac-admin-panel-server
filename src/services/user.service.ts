import bcrypt from "bcrypt";
import prisma from "../prisma/client.js";
import type { LoginUserInput, RegisterUserInput, UpdateUserData } from "../types/user.types.js";
import { generateToken } from "../middlewares/auth.js";

export const CreateUserService = async (data: RegisterUserInput) => {
    const { name, email, password,roleIds } = data;
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
        throw new Error('User already exists');
    }

    const userRole = await prisma.role.findUnique({
        where: { name: "USER" },
    });

    if (!userRole) {
        throw new Error("User role not found")
    }

    const assignedRoleIds = roleIds?.length ? roleIds : [userRole.id];

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            userRoles: {
                create:assignedRoleIds.map(roleId=>({
                    roleId,
                })),
            },
        },
    });

    return {
        user: {
            sub: user.id,
            email: user.email,
        }
    };
}

export const LoginUserService = async (data: LoginUserInput) => {
    const { email, password } = data;
    const user = await prisma.user.findUnique({ where: { email } });

    if(!user||!(await bcrypt.compare(password, user.password))){
        throw new Error("Invalid user or password");
    }

    const payload = {
        sub: user.id,
    }

    const token = generateToken(payload);
    return {
        user: {
            sub: user.id,
            email: user.email,
        },
        token,
    };
}

export const FetchUserService = async (id: string) => {
    const user = await prisma.user.findUnique({
        where: { id: id },
        include: {
            userRoles: {
                include: {
                    role: true,
                },
            },
        },
    });

    if(!user) return null;

    const roles=user.userRoles.map((ur)=>ur.role.name);

    const permissions=[
        ...new Set(
            user.userRoles.flatMap((ur)=>ur.role.permissions)
        )
    ];

    return {
        id: user.id,
        email: user.email,
        name: user.name,
        roles,
        permissions,
    };
}

export const FetchAllUsers = async (page: number = 1, size: number = 5) => {
    const skip = (page - 1) * size;
    const users = await prisma.user.findMany({
        orderBy: {
            createdAt: "desc",
        },
        skip: skip,
        take: size,
        include: {
            userRoles: {
                include: {
                    role: true
                }
            }
        }
    });;

    const result = users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        isActive:user.isActive,
        createdAt:user.createdAt,
        updatedAt:user.updatedAt,
        userRoles:user.userRoles,
        roles: user.userRoles.map(ur => ur.role),
    }));

    return result;
}

export const UpdateUserService = async (id: string, data: UpdateUserData) => {
    return await prisma.user.update({
        where: { id },
        data,
    })
}

export const UpdateUserPasswordService = async (id: string, password: string) => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    return await prisma.user.update({
        where: { id },
        data: {
            password: hashedPassword,
        }
    });
}

export const AssignUserRoleService = async (userId: string, roleIds: string[]) => {
    await prisma.$transaction([
        prisma.userRole.deleteMany({
            where: { userId: userId },
        }),

        prisma.userRole.createMany({
            data: roleIds.map((roleId) => ({
                roleId,
                userId,
            })),
            skipDuplicates: true,
        })
    ]);
}

export const DeleteUserService = async (id: string) => {
    return await prisma.user.delete({
        where: { id }
    })
}




