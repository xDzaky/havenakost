import os
import json

def main():
    with open('havena-kostv3.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. Extract SVG library
    svg_start = html.find('<!-- ============ SVG ICON LIBRARY ============ -->')
    svg_end = html.find('</svg>\n\n<!-- ============ TOPBAR ============ -->') + len('</svg>')
    svg_lib = html[svg_start:svg_end]

    # 2. Extract topbar
    topbar_start = html.find('<!-- ============ TOPBAR ============ -->')
    topbar_end = html.find('</header>') + len('</header>')
    topbar = html[topbar_start:topbar_end]

    # In topbar, ensure role buttons link to /owner and /admin
    topbar = topbar.replace(
        '<button data-act="role" data-role="owner"><span class="num">1</span><span class="pm-txt"><b>Dashboard Pemilik</b><small>Mitra · login</small></span></button>',
        '<a href="/owner" class="pm-link-btn" style="display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:11px;font-size:12.5px;color:var(--ink2);text-decoration:none;"><span class="num" style="width:22px;height:22px;border-radius:6px;background:var(--emerald-soft2);color:var(--emerald-dark);display:flex;align-items:center;justify-content:center;font-weight:800;">1</span><span class="pm-txt"><b>Dashboard Pemilik</b><small>Mitra · login</small></span></a>'
    )
    topbar = topbar.replace(
        '<button data-act="role" data-role="admin"><span class="num">2</span><span class="pm-txt"><b>Super Admin</b><small>Login khusus</small></span></button>',
        '<a href="/admin" class="pm-link-btn" style="display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:11px;font-size:12.5px;color:var(--ink2);text-decoration:none;"><span class="num" style="width:22px;height:22px;border-radius:6px;background:var(--emerald-soft2);color:var(--emerald-dark);display:flex;align-items:center;justify-content:center;font-weight:800;">2</span><span class="pm-txt"><b>Super Admin</b><small>Login khusus</small></span></a>'
    )

    # 3. Extract viewPublic
    pub_start = html.find('<main id="viewPublic"')
    pub_end = html.find('</main>', pub_start) + len('</main>')
    pub_main = html[pub_start:pub_end]

    # In CTA owner section, link button to /owner
    pub_main = pub_main.replace(
        'data-act="role" data-role="owner"',
        'onclick="window.location.href=\'/owner\'"'
    )

    # 4. Extract modals
    modals_start = html.find('<!-- ============ MODALS ============ -->')
    modals_end = html.find('<script>')
    modals = html[modals_start:modals_end]

    combined_html = f"{svg_lib}\n{topbar}\n{pub_main}\n{modals}"

    # 5. Extract all script contents
    scripts = []
    start = 0
    while True:
        s_idx = html.find('<script>', start)
        if s_idx == -1:
            break
        e_idx = html.find('</script>', s_idx)
        if e_idx == -1:
            break
        scripts.append(html[s_idx + len('<script>'):e_idx])
        start = e_idx + len('</script>')

    full_script = '\n'.join(scripts)

    # Clean script for Next.js:
    # Disable owner and admin DOM renders on landing page
    full_script = full_script.replace("if (role === 'owner') renderOwnerAll();", "// if (role === 'owner') renderOwnerAll();")
    full_script = full_script.replace("if (role === 'admin') renderAdminAll();", "// if (role === 'admin') renderAdminAll();")
    full_script = full_script.replace("renderOwnerAll();", "// renderOwnerAll();")
    full_script = full_script.replace("renderAdminAll();", "// renderAdminAll();")
    
    # Save raw html and raw script as separate files in src/data/ for clean import
    os.makedirs('src/data', exist_ok=True)
    with open('src/data/landing-html.json', 'w', encoding='utf-8') as f:
        json.dump({'html': combined_html}, f)

    with open('src/data/landing-script.js', 'w', encoding='utf-8') as f:
        f.write(full_script)

    print("Generated src/data/landing-html.json and src/data/landing-script.js")

if __name__ == '__main__':
    main()
