import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-lot-search',
  templateUrl: './lot-search.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule]
})
export class LotSearchComponent {
  lotId = '';
  // env objects returned by backend are normalized into camelCase here
  envs: any[] = [];
  sites: string[] = [];
  years: string[] = [];
  plantAreas: string[] = [];
  paMap: Record<string, string[]> = {};
  selectedSite: string = 'All';
  selectedEnv: string = 'All';
  selectedYear: string = 'All';
  selectedPlantArea: string = 'All';
  months: string[] = ['All','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  selectedMonth: string = 'All';
  loading = false;
  @Output() searchComplete = new EventEmitter<any>();
  constructor(private api: ApiService) {}

  // Return envs filtered by selectedSite to avoid using multiple structural directives
  get filteredEnvs() {
    if (!this.envs) return [];
    return this.selectedSite === 'All'
      ? this.envs
      : this.envs.filter((e: any) => e.site === this.selectedSite);
  }

  ngOnInit() {
    this.api.envs().subscribe((r:any) => {
      const raw = r || [];
      // normalize backend snake_case fields to camelCase expected by the component
      this.envs = raw.map((e: any) => ({
        name: e.name,
        site: e.site,
        yrFrom: e.yr_from ?? e.yrFrom ?? 0,
        yrTo: e.yr_to ?? e.yrTo ?? 0,
        active: e.active,
        tester: e.tester,
        plant: e.plant ?? '',
        area: e.area ?? '',
      }));
      const sites = new Set<string>();
      this.envs.forEach((e: any) => sites.add(e.site));
      this.sites = ['All', ...Array.from(sites)];
      // Build plant_area mapping similar to CGI: plant_area => [env names]
      const paSet = new Set<string>();
      this.envs.forEach((e: any) => {
        const paKey = `${e.plant}_${e.area}`;
        paSet.add(paKey);
        if (!this.paMap[paKey]) this.paMap[paKey] = [];
        this.paMap[paKey].push(e.name);
      });
      this.plantAreas = ['All', ...Array.from(paSet)];
      this.selectedPlantArea = 'All';
    });
  }

  onSiteChange() {
    if (this.selectedSite === 'All') {
      this.selectedEnv = 'All';
      this.years = ['All'];
      this.selectedYear = 'All';
      return;
    }
    const envsForSite = this.envs.filter((e: any) => e.site === this.selectedSite).map((e: any) => e.name);
    this.selectedEnv = envsForSite.length ? envsForSite[0] : 'All';
    const rec = this.envs.find((e: any) => e.name === this.selectedEnv);
    if (rec) {
      const yrs: string[] = [];
      for (let y = rec.yrFrom; y <= rec.yrTo; y++) yrs.push(String(y));
      this.years = ['All', ...yrs];
      this.selectedYear = 'All';
    } else {
      this.years = ['All'];
      this.selectedYear = 'All';
    }
  }

  onPlantAreaChange() {
    if (this.selectedPlantArea === 'All') {
      // reset to show all sites/envs
      this.selectedEnv = 'All';
      this.years = ['All'];
      this.selectedYear = 'All';
      return;
    }
    const envNames = this.paMap[this.selectedPlantArea] || [];
    this.selectedEnv = envNames.length ? envNames[0] : 'All';
    // set selectedSite based on first env's site
    const rec = this.envs.find((e: any) => e.name === this.selectedEnv);
    if (rec) {
      this.selectedSite = rec.site;
      const yrs: string[] = [];
      for (let y = rec.yrFrom; y <= rec.yrTo; y++) yrs.push(String(y));
      this.years = ['All', ...yrs];
      this.selectedYear = 'All';
    } else {
      this.years = ['All'];
      this.selectedYear = 'All';
    }
  }

  parseLots(): string[] {
    return (this.lotId || '')
      .split(/\n|,/) // newline or comma separated
      .map(s => s.trim())
      .filter(Boolean);
  }

  buildCriteria() {
    const lots = this.parseLots();
    const c: any[] = [];
    for (const lot of lots) {
  c.push({ lot_id: lot, env: this.selectedEnv || 'All', year: this.selectedYear || 'All', month: this.selectedMonth || 'All' });
    }
    return c;
  }

  search() {
    const payload = { criteria: this.buildCriteria() };
    this.loading = true;
    this.api.search(payload).subscribe({
      next: (r:any) => { this.loading = false; this.searchComplete.emit({ results: r.results || [] }); },
      error: () => { this.loading = false; this.searchComplete.emit({ results: [] }); }
    });
  }
}
