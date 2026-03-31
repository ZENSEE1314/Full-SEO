import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { pageId, clientId, url, title, domain, schemaType } = body;

    if (!pageId || !clientId || !schemaType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const clientCheck = await sql`
      SELECT id, name FROM clients WHERE id = ${clientId} AND org_id = ${session.orgId}
    `;
    if (clientCheck.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const clientName = (clientCheck[0] as { name: string }).name;
    const schema = generateSchema(schemaType, { url, title, domain, clientName });

    await sql`
      INSERT INTO schema_markups (page_id, schema_type, json_ld, is_valid, validation_errors)
      VALUES (${pageId}, ${schemaType}, ${JSON.stringify(schema)}::jsonb, true, ARRAY[]::text[])
    `;

    // Mark any "no structured data" issues as fixed
    await sql`
      UPDATE technical_issues SET fixed_at = NOW()
      WHERE page_id = ${pageId}
        AND issue_type IN ('missing_schema', 'no_structured_data', 'missing_json_ld')
        AND fixed_at IS NULL
    `;

    await sql`
      INSERT INTO agent_action_log (client_id, module, action_type, summary, status, triggered_by)
      VALUES (
        ${clientId}, 'website', 'schema_added',
        ${"Added " + schemaType + " schema to " + (url || pageId)},
        'completed', 'user'
      )
    `;

    return NextResponse.json({ ok: true, schema });
  } catch (error) {
    console.error("[generate-schema] POST error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { schemaId, clientId, json_ld } = body;

    if (!schemaId || !clientId || !json_ld) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const clientCheck = await sql`
      SELECT id FROM clients WHERE id = ${clientId} AND org_id = ${session.orgId}
    `;
    if (clientCheck.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    let parsed;
    try {
      parsed = JSON.parse(json_ld);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 422 });
    }

    const errors: string[] = [];
    if (!parsed["@context"]) errors.push("Missing @context");
    if (!parsed["@type"]) errors.push("Missing @type");

    await sql`
      UPDATE schema_markups SET
        json_ld = ${JSON.stringify(parsed)}::jsonb,
        is_valid = ${errors.length === 0},
        validation_errors = ${errors}
      WHERE id = ${schemaId}
    `;

    return NextResponse.json({ ok: true, errors });
  } catch (error) {
    console.error("[generate-schema] PATCH error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { schemaId, clientId } = body;

    if (!schemaId || !clientId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const clientCheck = await sql`
      SELECT id FROM clients WHERE id = ${clientId} AND org_id = ${session.orgId}
    `;
    if (clientCheck.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    await sql`DELETE FROM schema_markups WHERE id = ${schemaId}`;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[generate-schema] DELETE error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

function generateSchema(
  type: string,
  ctx: { url: string; title: string; domain: string; clientName: string }
): Record<string, unknown> {
  const base = { "@context": "https://schema.org" };

  switch (type) {
    case "WebPage":
      return {
        ...base,
        "@type": "WebPage",
        name: ctx.title || ctx.clientName,
        url: ctx.url,
        description: `${ctx.title || "Page"} on ${ctx.clientName}`,
        isPartOf: {
          "@type": "WebSite",
          name: ctx.clientName,
          url: `https://${ctx.domain}`,
        },
      };

    case "Article":
      return {
        ...base,
        "@type": "Article",
        headline: ctx.title || "Article Title",
        url: ctx.url,
        author: {
          "@type": "Organization",
          name: ctx.clientName,
        },
        publisher: {
          "@type": "Organization",
          name: ctx.clientName,
          url: `https://${ctx.domain}`,
        },
        datePublished: new Date().toISOString().split("T")[0],
        dateModified: new Date().toISOString().split("T")[0],
      };

    case "Organization":
      return {
        ...base,
        "@type": "Organization",
        name: ctx.clientName,
        url: `https://${ctx.domain}`,
        sameAs: [],
      };

    case "BreadcrumbList": {
      const parts = getPathParts(ctx.url);
      return {
        ...base,
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `https://${ctx.domain}`,
          },
          ...parts.map((part, i) => ({
            "@type": "ListItem",
            position: i + 2,
            name: part.name,
            item: part.url,
          })),
        ],
      };
    }

    case "LocalBusiness":
      return {
        ...base,
        "@type": "LocalBusiness",
        name: ctx.clientName,
        url: `https://${ctx.domain}`,
        address: {
          "@type": "PostalAddress",
          streetAddress: "",
          addressLocality: "",
          addressRegion: "",
          postalCode: "",
          addressCountry: "",
        },
        telephone: "",
        openingHours: "Mo-Fr 09:00-17:00",
      };

    case "FAQPage":
      return {
        ...base,
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What is " + ctx.clientName + "?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Edit this answer to describe " + ctx.clientName + ".",
            },
          },
        ],
      };

    case "Product":
      return {
        ...base,
        "@type": "Product",
        name: ctx.title || "Product Name",
        url: ctx.url,
        brand: {
          "@type": "Brand",
          name: ctx.clientName,
        },
        description: "Edit this product description.",
      };

    default:
      return {
        ...base,
        "@type": type,
        name: ctx.title || ctx.clientName,
        url: ctx.url,
      };
  }
}

function getPathParts(url: string): Array<{ name: string; url: string }> {
  try {
    const u = new URL(url);
    const segments = u.pathname.split("/").filter(Boolean);
    let path = u.origin;
    return segments.map((seg) => {
      path += `/${seg}`;
      return {
        name: seg.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        url: path,
      };
    });
  } catch {
    return [];
  }
}
