import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentsService } from '../catalog/documents.service';
import { Document } from '../catalog/entities/document.entity';
import {
  envelope,
  errorBody,
  oaiDate,
  tag,
  xmlEscape,
} from './oai-xml.util';

const PAGE_SIZE = 100;
const METADATA_PREFIX = 'oai_dc';

/**
 * Implementasi OAI-PMH 2.0 (protokol harvesting metadata perpustakaan)
 * dengan format oai_dc (Dublin Core) — kompatibel Indonesia OneSearch (Perpusnas).
 */
@Injectable()
export class OaiService {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly config: ConfigService,
  ) {}

  async handle(params: Record<string, string | undefined>): Promise<string> {
    const verb = params.verb;
    try {
      switch (verb) {
        case 'Identify':
          return this.identify();
        case 'ListMetadataFormats':
          return this.listMetadataFormats();
        case 'ListSets':
          return this.respond({ verb }, errorBody('noSetHierarchy', 'Repositori ini tidak memakai set.'));
        case 'ListIdentifiers':
          return this.listRecords(params, /*identifiersOnly*/ true);
        case 'ListRecords':
          return this.listRecords(params, false);
        case 'GetRecord':
          return this.getRecord(params);
        default:
          return this.respond(
            {},
            errorBody('badVerb', `Verb tidak dikenal: ${verb ?? '(kosong)'}`),
          );
      }
    } catch (err) {
      return this.respond(
        { verb },
        errorBody('badArgument', (err as Error).message),
      );
    }
  }

  private identify(): string {
    const body = tag(
      'Identify',
      tag('repositoryName', xmlEscape(this.config.get('OAI_REPOSITORY_NAME', 'Perpustakaan Digital Populi Center'))) +
        tag('baseURL', xmlEscape(this.baseUrl())) +
        tag('protocolVersion', '2.0') +
        tag('adminEmail', xmlEscape(this.config.get('OAI_ADMIN_EMAIL', 'library@populicenter.org'))) +
        tag('earliestDatestamp', oaiDate(new Date(0))) +
        tag('deletedRecord', 'no') +
        tag('granularity', 'YYYY-MM-DDThh:mm:ssZ'),
    );
    return this.respond({ verb: 'Identify' }, body);
  }

  private listMetadataFormats(): string {
    const body = tag(
      'ListMetadataFormats',
      tag(
        'metadataFormat',
        tag('metadataPrefix', METADATA_PREFIX) +
          tag('schema', 'http://www.openarchives.org/OAI/2.0/oai_dc.xsd') +
          tag('metadataNamespace', 'http://www.openarchives.org/OAI/2.0/oai_dc/'),
      ),
    );
    return this.respond({ verb: 'ListMetadataFormats' }, body);
  }

  private async listRecords(
    params: Record<string, string | undefined>,
    identifiersOnly: boolean,
  ): Promise<string> {
    const verb = identifiersOnly ? 'ListIdentifiers' : 'ListRecords';

    let from = params.from ? new Date(params.from) : null;
    let until = params.until ? new Date(params.until) : null;
    let offset = 0;

    if (params.resumptionToken) {
      const parsed = this.parseToken(params.resumptionToken);
      if (!parsed) {
        return this.respond({ verb }, errorBody('badResumptionToken', 'Token tidak valid'));
      }
      ({ from, until, offset } = parsed);
    } else if (params.metadataPrefix !== METADATA_PREFIX) {
      return this.respond(
        { verb, metadataPrefix: params.metadataPrefix },
        errorBody('cannotDisseminateFormat', `Hanya mendukung ${METADATA_PREFIX}`),
      );
    }

    const [docs, total] = await this.documentsService.listForHarvest(
      from,
      until,
      offset,
      PAGE_SIZE,
    );
    if (total === 0) {
      return this.respond({ verb }, errorBody('noRecordsMatch', 'Tidak ada record yang cocok'));
    }

    const items = docs
      .map((doc) =>
        identifiersOnly ? this.headerXml(doc) : this.recordXml(doc),
      )
      .join('');

    const nextOffset = offset + docs.length;
    const resumption =
      nextOffset < total
        ? tag(
            'resumptionToken',
            xmlEscape(this.buildToken(from, until, nextOffset)),
            `completeListSize="${total}" cursor="${offset}"`,
          )
        : '';

    return this.respond(
      { verb, metadataPrefix: METADATA_PREFIX },
      tag(verb, items + resumption),
    );
  }

  private async getRecord(
    params: Record<string, string | undefined>,
  ): Promise<string> {
    if (params.metadataPrefix !== METADATA_PREFIX) {
      return this.respond(
        { verb: 'GetRecord' },
        errorBody('cannotDisseminateFormat', `Hanya mendukung ${METADATA_PREFIX}`),
      );
    }
    const slug = this.slugFromIdentifier(params.identifier ?? '');
    if (!slug) {
      return this.respond(
        { verb: 'GetRecord', identifier: params.identifier },
        errorBody('idDoesNotExist', 'Identifier tidak dikenal'),
      );
    }
    try {
      const doc = await this.documentsService.findBySlug(slug);
      // Koleksi INTERNAL tak pernah diekspos ke harvester (PRD P1).
      if (doc.accessType === 'INTERNAL') {
        throw new Error('internal');
      }
      return this.respond(
        { verb: 'GetRecord', identifier: params.identifier, metadataPrefix: METADATA_PREFIX },
        tag('GetRecord', this.recordXml(doc)),
      );
    } catch {
      return this.respond(
        { verb: 'GetRecord', identifier: params.identifier },
        errorBody('idDoesNotExist', 'Identifier tidak dikenal'),
      );
    }
  }

  // ===== Pembentukan XML record =====

  private headerXml(doc: Document): string {
    return tag(
      'header',
      tag('identifier', xmlEscape(this.identifierFor(doc))) +
        tag('datestamp', oaiDate(doc.updatedAt)),
    );
  }

  private recordXml(doc: Document): string {
    const dc = [
      tag('dc:title', xmlEscape(doc.title)),
      ...doc.authors.map((a) => tag('dc:creator', xmlEscape(a))),
      ...(doc.subjects ?? []).map((s) => tag('dc:subject', xmlEscape(s))),
      doc.abstract ? tag('dc:description', xmlEscape(doc.abstract)) : '',
      doc.publisher ? tag('dc:publisher', xmlEscape(doc.publisher)) : '',
      doc.year ? tag('dc:date', String(doc.year)) : '',
      tag('dc:type', xmlEscape(doc.collectionType)),
      tag('dc:language', xmlEscape(doc.language)),
      doc.isbnIssn ? tag('dc:identifier', xmlEscape(doc.isbnIssn)) : '',
      tag('dc:identifier', xmlEscape(this.landingPageUrl(doc))),
      tag('dc:rights', xmlEscape(this.rightsLabel(doc))),
    ]
      .filter(Boolean)
      .join('');

    const metadata = tag(
      'metadata',
      `<oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/"` +
        ` xmlns:dc="http://purl.org/dc/elements/1.1/"` +
        ` xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"` +
        ` xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd">` +
        dc +
        `</oai_dc:dc>`,
    );

    return tag('record', this.headerXml(doc) + metadata);
  }

  private rightsLabel(doc: Document): string {
    switch (doc.accessType) {
      case 'OPEN':
        return 'Akses terbuka';
      case 'MEMBER':
        return 'Akses anggota terdaftar';
      default:
        return 'Akses melalui peminjaman digital';
    }
  }

  // ===== Identifier & token =====

  private identifierFor(doc: Document): string {
    return `oai:populicenter.org:${doc.slug}`;
  }

  private slugFromIdentifier(identifier: string): string | null {
    const match = identifier.match(/^oai:populicenter\.org:(.+)$/);
    return match ? match[1] : null;
  }

  private landingPageUrl(doc: Document): string {
    const webUrl = this.config.get('WEB_URL', 'http://localhost:3000');
    return `${webUrl}/katalog/${doc.slug}`;
  }

  private buildToken(from: Date | null, until: Date | null, offset: number): string {
    return Buffer.from(
      JSON.stringify({
        f: from?.toISOString() ?? null,
        u: until?.toISOString() ?? null,
        o: offset,
      }),
    ).toString('base64url');
  }

  private parseToken(
    token: string,
  ): { from: Date | null; until: Date | null; offset: number } | null {
    try {
      const parsed = JSON.parse(Buffer.from(token, 'base64url').toString());
      return {
        from: parsed.f ? new Date(parsed.f) : null,
        until: parsed.u ? new Date(parsed.u) : null,
        offset: Number(parsed.o) || 0,
      };
    } catch {
      return null;
    }
  }

  private baseUrl(): string {
    return this.config.get('OAI_BASE_URL', 'http://localhost:3001/api/v1/oai');
  }

  private respond(
    attrs: Record<string, string | undefined>,
    body: string,
  ): string {
    return envelope(this.baseUrl(), attrs.verb, attrs, body);
  }
}
