import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentsService } from '../catalog/documents.service';
import { Document } from '../catalog/entities/document.entity';
import { tag, xmlEscape } from '../oai/oai-xml.util';

export interface WidgetItem {
  title: string;
  url: string;
  authors: string[];
  year: number | null;
  type: string;
  category: string | null;
}

/**
 * Sindikasi katalog untuk situs utama Populi (PRD I3): umpan RSS "Publikasi
 * Terbaru" + widget tersemat. Sumber tunggal — menarik dari katalog PUBLISHED,
 * tak ada unggah dobel ke website.
 */
@Injectable()
export class SyndicationService {
  constructor(
    private readonly documents: DocumentsService,
    private readonly config: ConfigService,
  ) {}

  private get webUrl(): string {
    return this.config.get<string>('WEB_URL', 'http://localhost:3000');
  }

  private detailUrl(doc: Document): string {
    return `${this.webUrl}/katalog/${doc.slug}`;
  }

  private async latest(limit: number, category?: string): Promise<Document[]> {
    const perPage = Math.min(Math.max(limit || 10, 1), 50);
    const res = await this.documents.search({
      page: 1,
      perPage,
      category: category || undefined,
    } as any);
    return res.data;
  }

  // ===================================================================
  // Widget (JSON + skrip loader)
  // ===================================================================

  async widgetData(
    limit: number,
    category?: string,
  ): Promise<{ home: string; items: WidgetItem[] }> {
    const docs = await this.latest(limit, category);
    return {
      home: this.webUrl,
      items: docs.map((d) => ({
        title: d.title,
        url: this.detailUrl(d),
        authors: d.authors ?? [],
        year: d.year,
        type: d.collectionType,
        category: d.category?.name ?? null,
      })),
    };
  }

  /**
   * Skrip widget tersemat. Situs cukup memasang satu <script>; skrip menemukan
   * basis API dari `src`-nya sendiri, mengambil publikasi terbaru, lalu menyuntik
   * daftar bergaya minimal di tempat tag <script> berada.
   */
  widgetScript(): string {
    return `(function(){
  var s = document.currentScript || (function(){var a=document.querySelectorAll('script[src*="widget.js"]');return a[a.length-1];})();
  if(!s) return;
  var base = s.src.replace(/\\/widget\\.js.*$/, '');
  var limit = s.getAttribute('data-limit') || '5';
  var category = s.getAttribute('data-category') || '';
  var heading = s.getAttribute('data-title') || 'Publikasi Terbaru';
  var url = base + '/widget/publications?limit=' + encodeURIComponent(limit) + (category ? '&category=' + encodeURIComponent(category) : '');
  if(!document.getElementById('populi-widget-style')){
    var st = document.createElement('style'); st.id='populi-widget-style';
    st.textContent='.populi-widget{font-family:system-ui,Segoe UI,sans-serif;max-width:420px;border:1px solid #e3e8ef;border-radius:10px;overflow:hidden}.populi-widget h3{margin:0;padding:12px 16px;font-size:14px;background:#14508c;color:#fff}.populi-widget ul{list-style:none;margin:0;padding:0}.populi-widget li{padding:11px 16px;border-top:1px solid #eef1f5}.populi-widget a{color:#14508c;text-decoration:none;font-weight:600;font-size:14px}.populi-widget a:hover{text-decoration:underline}.populi-widget .m{display:block;color:#5b6779;font-size:12px;margin-top:2px}.populi-widget .f{padding:9px 16px;font-size:11px;color:#5b6779;text-align:right;border-top:1px solid #eef1f5}';
    document.head.appendChild(st);
  }
  var box = document.createElement('div'); box.className='populi-widget';
  box.innerHTML = '<h3>'+heading.replace(/[<>&]/g,'')+'</h3><ul></ul>';
  s.parentNode.insertBefore(box, s.nextSibling);
  fetch(url).then(function(r){return r.json();}).then(function(data){
    var items = (data && data.items) || [];
    var home = (data && data.home) || '#';
    var ul = box.querySelector('ul'); var esc=function(t){var d=document.createElement('div');d.textContent=t==null?'':String(t);return d.innerHTML;};
    if(!items.length){ ul.innerHTML='<li>Belum ada publikasi.</li>'; return; }
    items.forEach(function(it){
      var meta = [ (it.authors||[]).join(', '), it.year ].filter(Boolean).join(' \\u00b7 ');
      var li = document.createElement('li');
      li.innerHTML = '<a href="'+esc(it.url)+'" target="_blank" rel="noopener">'+esc(it.title)+'</a>'+(meta?'<span class="m">'+esc(meta)+'</span>':'');
      ul.appendChild(li);
    });
    var f=document.createElement('div'); f.className='f'; f.innerHTML='Sumber: <a href="'+esc(home)+'" target="_blank" rel="noopener">Populi Library</a>';
    box.appendChild(f);
  }).catch(function(){ box.querySelector('ul').innerHTML='<li>Gagal memuat publikasi.</li>'; });
})();`;
  }

  // ===================================================================
  // RSS 2.0
  // ===================================================================

  async rss(category?: string): Promise<string> {
    const docs = await this.latest(20, category);
    const feedUrl = `${this.config.get('APP_URL', 'http://localhost:3001')}/api/v1/feed.rss`;
    const items = docs.map((d) => this.rssItem(d)).join('');
    const built = docs[0]?.updatedAt ?? new Date();

    return (
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">` +
      `<channel>` +
      tag('title', xmlEscape('Perpustakaan Digital Populi Center — Publikasi Terbaru')) +
      tag('link', xmlEscape(this.webUrl)) +
      tag('description', xmlEscape('Publikasi dan koleksi terbaru dari Populi Center.')) +
      tag('language', 'id') +
      tag('lastBuildDate', rfc822(built)) +
      `<atom:link href="${xmlEscape(feedUrl)}" rel="self" type="application/rss+xml"/>` +
      items +
      `</channel></rss>`
    );
  }

  private rssItem(doc: Document): string {
    const link = this.detailUrl(doc);
    const desc =
      doc.abstract ??
      `${doc.collectionType} oleh ${(doc.authors ?? []).join(', ')}${doc.year ? ` (${doc.year})` : ''}.`;
    return (
      `<item>` +
      tag('title', xmlEscape(doc.title)) +
      tag('link', xmlEscape(link)) +
      tag('guid', xmlEscape(link), 'isPermaLink="true"') +
      tag('pubDate', rfc822(doc.createdAt)) +
      (doc.category ? tag('category', xmlEscape(doc.category.name)) : '') +
      (doc.authors ?? []).map((a) => tag('dc:creator', xmlEscape(a))).join('') +
      tag('description', xmlEscape(desc)) +
      `</item>`
    );
  }
}

/** Tanggal RFC-822 untuk RSS pubDate (mis. "Wed, 16 Jul 2026 08:00:00 GMT"). */
function rfc822(date: Date): string {
  return new Date(date).toUTCString();
}
