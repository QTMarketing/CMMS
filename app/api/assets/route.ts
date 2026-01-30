import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { canSeeAllStores, getScopedStoreId } from "@/lib/storeAccess";
import { isAdminLike, isMasterAdmin } from "@/lib/roles";
import { verifyMobileToken } from "@/lib/mobileAuth";

export async function GET(req: NextRequest) {
  try {
    // Try NextAuth session first (for web)
    let session = await getServerSession(authOptions);
    let role: string | undefined;
    let userStoreId: string | null = null;

    // If no session, try mobile token
    if (!session) {
      const mobileUser = verifyMobileToken(req);
      if (mobileUser) {
        role = mobileUser.role;
        userStoreId = mobileUser.storeId || null;
      } else {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        );
      }
    } else {
      role = (session.user as any)?.role as string | undefined;
      userStoreId = ((session.user as any)?.storeId ?? null) as
        | string
        | null;
    }

    const where: any = {};
    const urlStoreId = req.nextUrl.searchParams.get("storeId") || null;

    if (canSeeAllStores(role)) {
      if (urlStoreId) {
        where.storeId = urlStoreId;
      }
    } else {
      const scopedStoreId = getScopedStoreId(role, userStoreId);
      if (scopedStoreId) {
        where.storeId = scopedStoreId;
      } else {
        where.storeId = "__never_match__";
      }
    }

    // Get query parameters for filtering and sorting
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const make = searchParams.get("make");
    const model = searchParams.get("model");
    const status = searchParams.get("status");
    const parentAssetId = searchParams.get("parentAssetId");
    const parentAssetName = searchParams.get("parentAssetName");
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = searchParams.get("sortOrder") || "asc";
    
    // Add search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { make: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
        { parentAssetName: { contains: search, mode: "insensitive" } },
        { assetId: search && !isNaN(Number(search)) ? Number(search) : undefined },
        { parentAssetIdNumber: search && !isNaN(Number(search)) ? Number(search) : undefined },
      ].filter((condition) => {
        // Remove undefined values
        if (typeof condition === "object" && condition !== null) {
          return Object.values(condition).some((v) => v !== undefined);
        }
        return condition !== undefined;
      });
    }
    
    // Add category filter
    if (category) {
      where.category = category;
    }
    
    // Add make filter
    if (make) {
      where.make = make;
    }
    
    // Add model filter
    if (model) {
      where.model = model;
    }
    
    // Add status filter
    if (status) {
      where.status = status;
    }
    
    // Add parent asset ID filter
    if (parentAssetId) {
      const parentIdNum = parseInt(parentAssetId, 10);
      if (!isNaN(parentIdNum)) {
        where.parentAssetIdNumber = parentIdNum;
      }
    }
    
    // Add parent asset name filter
    if (parentAssetName) {
      where.parentAssetName = { contains: parentAssetName, mode: "insensitive" };
    }
    
    // Build orderBy clause
    const orderBy: any = {};
    if (sortBy === "assetId") {
      orderBy.assetId = sortOrder;
    } else if (sortBy === "name") {
      orderBy.name = sortOrder;
    } else if (sortBy === "category") {
      orderBy.category = sortOrder;
    } else if (sortBy === "make") {
      orderBy.make = sortOrder;
    } else if (sortBy === "model") {
      orderBy.model = sortOrder;
    } else if (sortBy === "status") {
      orderBy.status = sortOrder;
    } else if (sortBy === "parentAssetId") {
      orderBy.parentAssetIdNumber = sortOrder;
    } else if (sortBy === "parentAssetName") {
      orderBy.parentAssetName = sortOrder;
    } else {
      orderBy.name = "asc"; // Default
    }
    
    const items = await prisma.asset.findMany({ 
      where,
      include: {
        parentAsset: {
          select: {
            id: true,
            assetId: true,
            name: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy,
    });
    return NextResponse.json(items);
  } catch (err) {
    console.error("Error fetching assets:", err);
    // Fail soft with empty list so UI can still render
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !isAdminLike((session.user as any)?.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const role = (session.user as any)?.role as string | undefined;
    const userStoreId = ((session.user as any)?.storeId ?? null) as
      | string
      | null;

    const body = await request.json();
    const {
      name,
      location,
      status,
      storeId: bodyStoreId,
      assetId,
      parentAssetId,
      parentAssetIdNumber,
      parentAssetName,
      make,
      model,
      category,
      toolCheckOut,
      checkOutRequiresApproval,
      defaultWOTemplate,
    } = body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Name is required." },
        { status: 400 }
      );
    }

    const normalizedStatus =
      typeof status === "string" && status.trim().length > 0
        ? status.trim()
        : "Active";

    let storeId: string | null = null;

    if (isMasterAdmin(role)) {
      if (!bodyStoreId || typeof bodyStoreId !== "string") {
        return NextResponse.json(
          { success: false, error: "storeId is required for assets." },
          { status: 400 }
        );
      }
      storeId = bodyStoreId.trim();
    } else {
      // STORE_ADMIN: use their own storeId
      storeId = userStoreId;
    }

    if (!storeId) {
      return NextResponse.json(
        {
          success: false,
          error: "Your user account is not associated with a store.",
        },
        { status: 400 }
      );
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Invalid store selected." },
        { status: 400 }
      );
    }

    // Validate parent asset if provided (by ID or numeric ID)
    let parentAssetData: { id: string; assetId: number | null; name: string } | null = null;
    
    if (parentAssetId) {
      parentAssetData = await prisma.asset.findUnique({
        where: { id: parentAssetId },
        select: { id: true, assetId: true, name: true },
      });
      if (!parentAssetData) {
        return NextResponse.json(
          { success: false, error: "Invalid parent asset selected." },
          { status: 400 }
        );
      }
    } else if (parentAssetIdNumber) {
      parentAssetData = await prisma.asset.findUnique({
        where: { assetId: parentAssetIdNumber },
        select: { id: true, assetId: true, name: true },
      });
      if (!parentAssetData) {
        return NextResponse.json(
          { success: false, error: "Invalid parent asset ID number." },
          { status: 400 }
        );
      }
    }

    // Determine final numeric assetId:
    // - If a numeric assetId was provided, use it
    // - Otherwise, auto-assign the next number for this store
    let finalAssetId: number | null = null;
    if (typeof assetId === "number") {
      finalAssetId = assetId;
    } else {
      const lastAssetWithId = await prisma.asset.findFirst({
        where: { storeId, assetId: { not: null } },
        orderBy: { assetId: "desc" },
        select: { assetId: true },
      });
      const currentMax = lastAssetWithId?.assetId ?? 0;
      finalAssetId = currentMax + 1;
    }

    const asset = await prisma.asset.create({
      data: {
        id: crypto.randomUUID(),
        assetId: finalAssetId,
        name: name.trim(),
        location:
          typeof location === "string" && location.trim().length > 0
            ? location.trim()
            : "",
        status: normalizedStatus,
        make: make && typeof make === "string" ? make.trim() : null,
        model: model && typeof model === "string" ? model.trim() : null,
        category: category && typeof category === "string" ? category.trim() : null,
        parentAssetId: parentAssetData?.id || (parentAssetId && typeof parentAssetId === "string" ? parentAssetId : null),
        parentAssetIdNumber: parentAssetData?.assetId || (parentAssetIdNumber && typeof parentAssetIdNumber === "number" ? parentAssetIdNumber : null),
        parentAssetName: parentAssetName && typeof parentAssetName === "string" ? parentAssetName.trim() : (parentAssetData?.name || null),
        toolCheckOut: toolCheckOut && typeof toolCheckOut === "number" ? toolCheckOut : 0,
        checkOutRequiresApproval: checkOutRequiresApproval && typeof checkOutRequiresApproval === "number" ? checkOutRequiresApproval : 0,
        defaultWOTemplate: defaultWOTemplate && typeof defaultWOTemplate === "number" ? defaultWOTemplate : null,
        storeId: store.id,
      },
      include: {
        parentAsset: {
          select: {
            id: true,
            assetId: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      { success: true, data: asset },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error creating asset:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create asset." },
      { status: 500 }
    );
  }
}
