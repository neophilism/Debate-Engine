export function escapeXml(input:unknown){
 return String(input??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
}
export type FeedEntry={title:string;description:string;id:string;url:string;publishedAt:string};
export function rssFeed(url:string,items:FeedEntry[]){
 const entries=items.map(item=>[
  "<item>","<title>"+escapeXml(item.title)+"</title>",
  "<link>"+escapeXml(item.url)+"</link>",
  "<guid isPermaLink=\"false\">"+escapeXml(item.id)+"</guid>",
  "<pubDate>"+new Date(item.publishedAt).toUTCString()+"</pubDate>",
  "<description>"+escapeXml(item.description)+"</description>","</item>"
 ].join("\n")).join("\n");
 return '<?xml version="1.0" encoding="UTF-8"?>\n'+
 '<rss version="2.0"><channel>\n'+
 '<title>Public Debate Engine — Joint Policy Agreements</title>\n'+
 '<description>Policy agreements accepted by both participating candidates, with original public debate records.</description>\n'+
 '<link>'+escapeXml(url)+'</link>\n'+entries+'\n</channel></rss>\n';
}
