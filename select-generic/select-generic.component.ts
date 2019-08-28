import { Component, OnInit, Input, Output, EventEmitter, ViewChild, forwardRef, OnChanges, OnDestroy } from '@angular/core';
import { LSelect2Component } from '../l-select2/l-select2.component';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';

/**
 * Select générique.
 *
 * Fonctionnalités implémentées :
 *  - select avec recherche intégrée
 *  - compatible reactive forms
 *  - compatible ngModel
 *  - adaptable à n'importe quel modèle de données
 *  - implémentation des événements
 *  - gestion des filtres
 *  - mode débug et contrôle d'erreur
 *  - basé sur le LSelect2 de jQuery UI
 *
 * # Utilisation
 *
 * L'exemple ci-dessous montre l'utilisation normale avec une fonction source de données.
 * Cette fonction est définie dans le code TS, et fournit un Observable<T[]> au select
 * générique. Le select pourra ensuite interroger la source de données au besoin pour
 * charger les données. Les attributs "dataIdAttribute" et "dataTextAttribute" permettent
 * respectivement de définir l'attribut représentant l'ID (numérique de préférence) et
 * celui utilisé pour afficher l'entité (un libellé). Dans les exemples suivants, ces
 * attributs ne sont pas indiqués, néanmoins ils sont obligatoires.
 *
 * (Code HTML)
 *
 *    <app-select-generic
 *       [dataProvider]="this.getTablesDeStockages($event)"
 *       dataIdAttribute="idsTableStockage"
 *       dataTextAttribute="libelleIhm">
 *    </app-select-generic>
 *
 * (Code TS)
 *
 *    getTablesDeStockages(request: GenericSelectDataRequest<FullStorageTableResponse>) {
 *       request.response(this.tableDeStockageWSService.getAll());
 *    }
 *
 * Mais si les données sont déjà connues, il est également possible d'utiliser le select
 * en lui fournissant directement le tableau de données :
 *
 *    <app-select-generic [data]="this.listTablesStockages"></app-select-generic>
 *
 * Avec l'attribut this.listTablesStockages de type T[].
 *
 * Il est également possible de passer des paramètres à la fonction qui renvoie la data source.
 * Cela est utile lorsque la requête à faire au serveur va dépendre d'un paramètre qui n'est
 * pas connu à l'avance, ou bien qui peut changer par la suite.
 *
 * (Code HTML)
 *
 *    <app-select-generic
 *       [dataProvider]="this.getTablesDeStockages($event)"
 *       [options]="this.typeTableDeStockage"
 *       dataIdAttribute="idsTableStockage"
 *       dataTextAttribute="libelleIhm">
 *    </app-select-generic>
 *
 * (Code TS)
 *
 *    protected typeTableDeStockage = {type: 'niveau1'};
 *
 *    getTablesDeStockages(request: GenericSelectDataRequest<FullStorageTableResponse>) {
 *       // On reçoit le type dans l'attribut "opts"
 *       request.response(this.tableDeStockageWSService.getByType(request.opts.type));
 *    }
 *
 *    anotherFunction() {
 *      // Si on change la valeur de cette variable passée en options, les données
 *      // sont automatiquement rechargées en rappelant la datasource.
 *      this.typeTableDeStockage = {type: 'niveau2'};
 *    }
 *
 * ## Utilisation comme FormControl dans un reactive form :
 *
 *    <app-select-generic formControlName="tableDeStockage"></app-select-generic>
 *
 * ## Utilisation en mode ng-model :
 *
 *    <app-select-generic [(ngModel)]="this.model"></app-select-generic>
 *
 * ## Utilisation des événements. Pour l'événement "selectionChange", la fonction de
 * callback va recevoir l'item sélectionné. Dans le cas de l'événement "emptySelection",
 * c'est la valeur précédente avant la sélection du vide qui sera envoyée.
 *
 *    <app-select-generic
 *       (selectionChange)="this.handleSelectionChange($event)"
 *       (emptySelection)="this.handleEmptySelection($event)">
 *    </app-select-generic>
 *
 * ## Autres attributs utiles :
 *
 *  1. Ajouter une valeur vide (désactivé par défaut)
 *    <app-select-generic [addEmptyValue]="true"></app-select-generic>
 *  2. Mode débug (désactivé par défaut)
 *    <app-select-generic [debug]="true"></app-select-generic>
 *  3. Désactivation du select
 *    <app-select-generic [enabled]="false"></app-select-generic>
 *
 * ## Méthodes utiles :
 *
 *  - loadData()                      Provoque le rechargement des données
 *  - setSelectedValue(T)             Change la valeur sélectionnée
 *  - getSelectedValue(): T           Renvoie la valeur sélectionnée
 *  - isValueSelected(): boolean      Renvoie TRUE si une valeur est sélectionnées
 *  - setEnabled(boolean)             Change l'état activé
 *  - setSelectedId(string)           Change la valeur sélectionnée, à partir de l'ID uniquement
 *  - clear()                         Retire la sélection en cours
 *
 * @since 07/2019
 * @author rbello
 */
@Component({
  selector: 'app-select-generic',
  templateUrl: './select-generic.component.html',
  styleUrls: ['./select-generic.component.scss'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => SelectGenericComponent),
    multi: true
  }]
})
export class SelectGenericComponent<T> implements OnInit, OnChanges, OnDestroy, ControlValueAccessor {

  // Référence vers le l-select-2
  @ViewChild(LSelect2Component) lselect2Cmp: LSelect2Component;

  // Les données affichée dans le select. Il est possible de fournir directement les
  // données au select, sans passer par le DataProvider.
  @Input() data: T[] = [];

  // Le filtre (s'il existe)
  filterFunction: (item: T) => boolean = null;

  // Les données masquées par le filtre
  filteredValues: T[] = null;

  // La valeur sélectionnée, ou NULL si aucune sélection
  selectedValue: T | null = null;

  // Contient la valeur précédente
  previousValue: T | null = null;

  // Etat activé
  @Input() enabled = true;

  // Permet de spécifier des options
  @Input() options = {};

  // Permet de préciser quel est l'attribut dans la donnée faisant office d'identifiant
  @Input() dataIdAttribute: string = null;

  // Permet de spécifier un nom d'attribut ou une fonction permettant d'afficher la valeur string de la donnée
  @Input() dataTextAttribute: string | Function = null;

  // Indique si l'on doit ajouter une valeur vide
  @Input() addEmptyValue = false;

  // Evénement levé quand le champ cherche ses données.
  @Output() dataProvider: EventEmitter<GenericSelectDataRequest<T>> = new EventEmitter<GenericSelectDataRequest<T>>();

  // Evénement quand la sélection change.
  @Output() selectionChange: EventEmitter<T> = new EventEmitter<T>();

  // Evénement quand l'utilisateur a sélectionné la ligne vide
  @Output() emptySelection: EventEmitter<T> = new EventEmitter<T>();

  // Indique si ce composant est passé par sa méthode ngOnInit
  initialized = false;

  // Indique si l'on a lancé actuellement une requête au server, en attente de sa réponse
  loading = false;

  // Indique si on affiche les logs de debug
  @Input() debug = false;

  // Indique si le composant doit lever strictement des erreurs à chaque mauvaise manipulation
  @Input() strict = false;

  // Permet d'indiquer le nom du sélecteur dans son formulaire
  @Input() formControlName = null;

  // Indique si le composant est en état d'erreur
  failure: Error = null;

  // Contient la souscription à l'observable servant de data-provider
  currentDataRequest: Subscription;

  // Sert à désigner l'instance en cours (this) dans la callback (changement de zone).
  control: any;

  // Méthode de propagation du ControlValueAccessor
  propagateChange: any = () => {};

  constructor() {
  }

  ngOnInit(): void {
    // Le composant est initialisé
    this.initialized = true;
    // On charge les données
    this.loadData();
  }

  ngOnDestroy(): void {
    if (this.currentDataRequest) {
      this.currentDataRequest.unsubscribe();
      this.currentDataRequest = null;
    }
    if (this.dataProvider) {
      this.dataProvider.observers.length = 0;
    }
    this.data = [];
  }

  registerOnTouched(fn: () => void): void { }

  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }

  ngOnChanges(change): void {
    // On ne traite par les changements si le composant n'a pas été initialisé
    if (!this.initialized) {
      // L'utilisateur fourni directement les données
      if ('data' in change) {
        this.handleDataProviderSuccess(change.data.currentValue);
      }
      return;
    }
    // En cas de changement après l'initialisation, on demande à recharger les données
    this.loadData();
  }

  /**
   * Charge les données : en réalité, demande par événement à se faire envoyer
   * une fonction de type DataProvider (renvoyant un Observable<T[]>). Le code
   * utilisateur doit répondre en appelant la fonction response() dans l'événement,
   * ce qui va appeler en fait la fonction setDataProvider() de cette classe.
   */
  public loadData(): void {
    if (this.dataProvider.observers.length > 0) {
      this.debugLog('Demande d\'approvisionnement des données...');
    }
    // On annule l'ancienne requête si elle existe
    if (this.currentDataRequest) {
      this.currentDataRequest.unsubscribe();
      this.currentDataRequest = null;
    }
    // On demande à avoir un DataProvider
    this.dataProvider.emit({
      opts: this.options,
      response: this.setDataProvider,
      control: this
    });
  }

  /**
   * Méthode de callback appelée par le DataProvider pour fournir à ce select
   * un observable qui fournira les données au select.
   */
  setDataProvider(dataProvider: Observable<T[]>): void {
    const src = this.control;
    if (!src) {
      // Peut arriver dans certains cas de destruction des objets
      return;
    }
    if (!dataProvider) {
      throw src.handleDataProviderError('La fonction pointée par [dataProvider] doit renvoyer un'
        + ' Observable<T[]> avec request.response(...)');
    }
    src.loading = true;
    src.currentDataRequest = dataProvider.subscribe(
        // Success
        (results: T[]) => {
          src.loading = false;
          src.currentDataRequest = null;
          src.handleDataProviderSuccess(results);
        },
        // Error
        (error) => {
          src.loading = false;
          src.currentDataRequest = null;
          src.handleDataProviderError(error);
        }
    );
  }

  /**
   * Méthode interne pour le traitement des données de la datasource.
   */
  handleDataProviderSuccess(results: any[]): void {

    // On vérifie que les données forment une collection
    if (results === null || !(results instanceof Array)) {
      throw this.handleError('La source de donnée observable doit renvoyer une '
        + 'collection. Actuellement : ' + typeof(results));
    }

    // On vérifie la présence de l'attribut ID obligatoire
    if (results.length > 0 && !('id' in results[0])) {
      // Si on ne trouve pas d'ID, on regarde si l'utilisateur a fourni un attribut identifiant
      if (!this.dataIdAttribute) {
        throw this.handleError('Les données ne contiennent pas de propriété "id" :'
          + ' veuillez spécifier la propriété à utiliser avec [dataIdAttribute]="nom"');
      }
      // On va créer l'attribut "id" dans les données
      results = results.map(item => {
        return { ...(item as object), 'id': '' + item[this.dataIdAttribute] };
      });
    }
    else if (this.dataIdAttribute) {
      // L'attribut "id" existe mais l'utilisateur a fourni un autre attribut : on va forcer l'attribut "id" dans les données
      results = results.map(item => {
        return { ...(item as object), 'id': '' + item[this.dataIdAttribute] };
      });
    }

    // On vérifie la présence de l'attribut TEXT obligatoire
    if (results.length > 0 && !('text' in results[0])) {
      // Si on ne trouve pas de TEXT, on regarde si l'utilisateur a fourni une solution
      if (!this.dataTextAttribute) {
        throw this.handleError('Les données ne contiennent pas de propriété "text" :'
          + ' veuillez spécifier la propriété à utiliser avec [dataTextAttribute]="nom ou fonction"');
      }
      // On va créer l'attribut "text" dans les données
      if (this.dataTextAttribute instanceof Function) {
        const fn: Function = this.dataTextAttribute;
        results = results.map(item => {
          return { ...(item as object), 'text': fn(item) };
        });
      }
      else {
        results = results.map(item => {
          return { ...(item as object), 'text': item['' + this.dataTextAttribute] };
        });
      }

    }

    // Ajout de la valeur vide (si demandé)
    if (results.length > 0 && this.addEmptyValue) {
      results.unshift({id: '-1', text: ' '});
    }

    // On enregistre les données
    // TODO Appliquer le filtre s'il existe avant les données
    this.data = results;

    this.debugLog('Chargement terminé de ' + results.length + ' élément(s)');

    // La première valeur devient sélectionnée
    if (results.length > 0) {
      this.set(this.selectedValue || results[0], true, true);
    }
  }

  /**
   * Méthode interne pour le traitement et l'affichage des erreurs.
   */
  handleError(error: Error | string): Error {
    if (error['httpCode'] !== undefined) {
      error = new Error((error as any).httpCode + ' : ' + (error as any).httpMsg);
    }
    else if (!(error instanceof Error)) {
      error = new Error('' + error);
    }
    this.failure = error;
    this.debugLog('Erreur : ' + error.message);
    return error;
  }

  /**
   * Permet de s'assurer qu'un objet comporte bien les attributs attendus par le l-select2
   * à savoir un 'id' et un attribut 'text'.
   */
  private normalizeData(item: T): any {

    // On vérifie la présence de l'attribut ID obligatoire
    if (!('id' in item)) {
      // Si on ne trouve pas d'ID, on regarde si l'utilisateur a fourni un attribut identifiant
      if (!this.dataIdAttribute) {
        throw this.handleError('Les données ne contiennent pas de propriété "id" :'
          + ' veuillez spécifier la propriété à utiliser avec [dataIdAttribute]="nom"');
      }
      // On va créer l'attribut "id" dans les données
      item = { ...(item as any), 'id': '' + item[this.dataIdAttribute] };
    }
    else if (this.dataIdAttribute) {
      // L'attribut "id" existe mais l'utilisateur a fourni un autre attribut : on va forcer l'attribut "id" dans les données
      item = { ...(item as any), 'id': '' + item[this.dataIdAttribute] };
    }

    // On vérifie la présence de l'attribut TEXT obligatoire
    if (!('text' in item)) {
      // Si on ne trouve pas de TEXT, on regarde si l'utilisateur a fourni une solution
      if (!this.dataTextAttribute) {
        throw this.handleError('Les données ne contiennent pas de propriété "text" :'
          + ' veuillez spécifier la propriété à utiliser avec [dataTextAttribute]="nom ou fonction"');
      }
      // On va créer l'attribut "text" dans les données
      if (this.dataTextAttribute instanceof Function) {
        const fn: Function = this.dataTextAttribute;
        item = { ...(item as any), 'text': fn(item) };
      }
      else {
        item = { ...(item as any), 'text': item['' + this.dataTextAttribute] };
      }
    }

    return item;
  }

  /**
   * Retire les données de ce select ainsi que la sélection actuelle.
   */
  clear() {
    if (this.loading) {
      throw this.handleError('Impossible d\'appliquer la fonction clear() pendant le chargement des données');
    }
    this.data = [];
    this.filteredValues = null;
    this.selectedValue = null;
    this.previousValue = null;
  }

  /**
   * Modifie la valeur actuelle sélectionnée. Utilisé par ngModel pour écrire la
   * valeur vers ce composant.
   */
  writeValue(selectedValue: T): void {
    this.set(selectedValue, false);
  }

  /**
   * Modifie la valeur actuelle sélectionnée. Utilisable par l'utilisateur pour
   * modifier la sélection.
   */
  setSelectedValue(selectedValue: T): void {
    this.set(selectedValue, true);
  }

  /**
   * Evénement relié au changement de valeur via la liste select. Dans ce cas
   * on propage l'événement.
   */
  onValueChange($event): void {
    this.set(this.selectedValue, true);
  }

  /**
   * Modifie la valeur actuelle sélectionnée.
   */
  private set(selectedValue: T, propagateChange: boolean, restore: boolean = false): void {

    // Sélection de la valeur vide
    if ((!!selectedValue && 'id' in selectedValue && selectedValue['id'] === '-1') || (selectedValue as any) === '') {
      selectedValue = null;
    }

    // On vérifie que l'on travaille bien avec des objets
    if (!!selectedValue !== null && typeof selectedValue !== 'object') {
      this.handleError(new Error('la valeur à sélectionner doit être un objet, actuellement: ' + (typeof selectedValue)));
      return;
    }

    if (!!selectedValue) {
      // Il s'agit d'un vrai objet : normalisation
      this.selectedValue = this.normalizeData(selectedValue);
    }
    else {
      // Il s'agit de la valeur vide : on supprime la sélection
      if (this.addEmptyValue) {
        this.selectedValue = ({id: '-1', text: ''} as any) as T;
      }
      // Valeur NULL mais pas de ligne vide
      else {
        if (this.strict) {
          throw new Error('Impossible de mettre une valeur NULL sur un select generique sans valeur vide');
        }
        this.selectedValue = null;
        return;
      }
    }

    this.debugLog('Value changed : ' + JSON.stringify(this.getSelectedValue())
      + ' [DataLoaded=' + (this.data && this.data.length > 0)
      + ' PropagateChange=' + propagateChange
      + ' Restore=' + restore + ']');

    // Vérification que la valeur a bien été affectée
    if (this.debug && this.isValueSelected()) {
      const id = (this.getSelectedValue() as any).id;
      if (id === undefined || id === 'undefined') {
        this.handleError(new Error('la valeur sélectionnée ne possède pas d\'attribut identifiant: "'
          + (this.dataIdAttribute || 'id') + '"'));
      }
      else if (!this.getItemById(id)) {
        this.handleError(new Error('la valeur avec ID "' + id + '" n\'a pas été trouvée dans les données'));
      }
      else if (this.failure) {
        this.failure = null;
      }
    }

    // Propagation du changement
    if (propagateChange) {
      this.propagateChange(selectedValue);
      this.selectionChange.emit(selectedValue);
      if (!selectedValue) {
        // Levée d'un événement lors de la sélection vide
        this.emptySelection.emit(this.previousValue);
      }
    }

    this.previousValue = selectedValue;
  }

  /**
   * Renvoie la valeur actuellement sélectionnée, ou NULL.
   */
  getSelectedValue(): T {
    if (!this.isValueSelected()) {
      return null;
    }
    return this.selectedValue;
  }

  /**
   * Indique si une valeur est actuellement sélectionnée.
   */
  isValueSelected(): boolean {
    if (this.addEmptyValue && this.selectedValue && (this.selectedValue as any).id === '-1') {
      // Cas de sélection de la ligne vide
      return false;
    }
    return !!this.selectedValue;
  }

  /**
   * Permet de positionner un filtre pour masquer certaines données.
   */
  setFilter(acceptFunction: (item: T) => boolean): void {
    // Annulation du filtre
    if (acceptFunction === null) {
      if (this.filteredValues) {
        // On recombine les deux tableaux
        this.data = [...this.data, ...this.filteredValues];
      }
      // On supprime le filtre et le tableau de données filtrées
      this.filterFunction = null;
      this.filteredValues = null;
      return;
    }
    // Application d'un filtre
    this.filterFunction = acceptFunction;
    this.filteredValues = [];
    this.data = this.data.filter(item => {
      if (!acceptFunction(item)) {
        this.filteredValues.push(item);
        return false;
      }
      return true;
    });
  }

  /**
   * Indique si un filtre est actuellement actif.
   */
  isFilterEnabled(): boolean {
    return this.filterFunction !== null;
  }

  /**
   * Modifie l'état d'activation/désactivation du composant.
   */
  setEnabled(state: boolean): void {
    this.enabled = state;
  }

  /**
   * Permet de positionner la sélection à partir uniquement de l'ID.
   * Renvoie TRUE si un objet a l'ID similaire a été trouvé, sinon FALSE.
   *
   * Attention : méthode EXPERIMENTALE, son comportement peut évoluer !
   */
  setSelectedId(id: string): boolean {
    const search = this.getItemById(id);
    if (search) {
      this.set(search, false);
      return true;
    }
    return false;
  }

  /**
   * Permet de récupérer l'item parmi la liste des données qui correspond
   * à l'ID donné en paramètre. Renvoie undefined si l'ID ne correspond pas.
   */
  getItemById(id: string): T {
    // On cherche l'objet qui correspond
    const search = this.data.find(item => (item as any).id === id);
    return search;
  }

  /**
   * Méthode permettant de formatter les logs de debug.
   */
  protected debugLog(msg: string): void {
    if (!this.debug) {
      return;
    }
    const id = this.formControlName ? ' #' + this.formControlName : '';
    console.log('%c[SelectGeneric%s]%c %s', 'background:#034d23;color:#bada55', id, 'background:none;color:initial', msg);
  }

}

/**
 * Interface utilisée pour demander la source de données.
 */
export interface GenericSelectDataRequest<T> {
  // Le select à l'origine de la demande
  control: SelectGenericComponent<T>;
  // Les options passées par l'utilisateur
  opts: any;
  // La méthode pour envoyer la datasource au select
  response: (data: Observable<T[]>) => void;
}
