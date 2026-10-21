// Gather what the systems console needs: the user's name, language use across their own repos, and an icon per system.
// Icons come from Simple Icons; the GraphQL API needs a token.

const QUERY = `query($login: String!) {
  user(login: $login) {
    login name
    repositories(ownerAffiliations: OWNER, isFork: false, first: 100, orderBy: { field: PUSHED_AT, direction: DESC }) {
      totalCount
      nodes { languages(first: 20) { edges { size node { name } } } }
    }
  }
}`;

// Simple Icons slugs whose GitHub language name differs from the icon title.
const LANGUAGE = {
  gnubash: "Shell", docker: "Dockerfile", html5: "HTML", css3: "CSS", css: "CSS", cplusplus: "C++",
  csharp: "C#", dotnet: "C#", nodedotjs: "JavaScript", vuedotjs: "Vue", nixos: "Nix", cmake: "CMake",
};

// "TITLE: slug, slug=Label, ..." per line -> [{ title, items: [{ slug, label }] }].
export function parseSystems(spec) {
  return spec.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
    const i = line.indexOf(":");
    if (i < 0) throw new Error(`Bad systems line (expected "TITLE: slug, slug"): ${line}`);
    const items = line.slice(i + 1).split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
      const [slug, label] = s.split("=").map((p) => p.trim());
      return { slug: slug.toLowerCase(), label };
    });
    return { title: line.slice(0, i).trim(), items };
  });
}

async function icon(slug) {
  try {
    const res = await fetch(`https://cdn.simpleicons.org/${encodeURIComponent(slug)}`, { headers: { "User-Agent": "systems-console" } });
    if (!res.ok) throw new Error(res.status);
    const svg = await res.text();
    return { title: svg.match(/<title>([^<]*)<\/title>/)?.[1] || slug, path: svg.match(/ d="([^"]+)"/)?.[1] || "" };
  } catch {
    console.warn(`warning: no Simple Icons icon for "${slug}", drawing a blank plate`);
    return { title: slug, path: "" };
  }
}

export async function getStats(user, token, systems) {
  if (!token) throw new Error("A GITHUB_TOKEN is needed to read language stats");
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "User-Agent": "systems-console", "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { login: user } }),
  });
  if (!res.ok) throw new Error(`GraphQL request failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error(`GraphQL error: ${json.errors.map((e) => e.message).join("; ")}`);
  const u = json.data.user;

  const langs = {};
  for (const r of u.repositories.nodes) for (const e of r.languages.edges) {
    const l = (langs[e.node.name.toLowerCase()] ||= { repos: 0, size: 0 });
    l.repos++; l.size += e.size;
  }
  const total = Object.values(langs).reduce((a, l) => a + l.size, 0) || 1;

  const slugs = [...new Set(systems.flatMap((g) => g.items.map((it) => it.slug)))];
  const icons = Object.fromEntries(await Promise.all(slugs.map(async (s) => [s, await icon(s)])));

  return {
    login: u.login, name: u.name || u.login, repoCount: u.repositories.totalCount,
    groups: systems.map((g) => ({
      title: g.title,
      languages: /lang/i.test(g.title),   // a language with no code in your repos shows as standby
      items: g.items.map(({ slug, label }) => {
        const ic = icons[slug], lang = langs[(LANGUAGE[slug] || ic.title).toLowerCase()];
        return { slug, label: label || ic.title, path: ic.path, ...(lang && { repos: lang.repos, pct: lang.size / total }) };
      }),
    })),
    generatedAt: new Date().toISOString(),
  };
}
