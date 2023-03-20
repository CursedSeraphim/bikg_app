export interface CsvData {
  Id: string;
  x?: number;
  y?: number;
  focus_node?: string;
  [key: string]: string | number | undefined;
}
