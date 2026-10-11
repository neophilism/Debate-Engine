import type {MetadataRoute} from "next";
export default function robots():MetadataRoute.Robots {
 const base=process.env.PUBLIC_BASE_URL||process.env.RENDER_EXTERNAL_URL||"http://localhost:3000";
 return {rules:[{userAgent:"*",allow:["/","/debates","/candidates","/press","/protocol","/embed","/feed.xml"],disallow:["/workspace","/sign-in","/api/account","/api/admin","/api/media/upload"]}],sitemap:new URL("/sitemap.xml",base).toString()};
}
