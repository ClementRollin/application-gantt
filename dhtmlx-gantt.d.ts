declare module "dhtmlx-gantt" {
    interface Gantt {
        init(container: HTMLElement): void;
        clearAll(): void;
        parse(data: any): void;
    }
    const gantt: Gantt;
    export default gantt;
}