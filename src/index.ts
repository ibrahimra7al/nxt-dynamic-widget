import * as path from 'path';
import * as fs from 'fs';

const resolveSubdirectories = function (context: string): string[] {
    return fs
        .readdirSync(context)
        .map(p => path.join(context, p))
        .filter(p => fs.existsSync(p) && fs.lstatSync(p).isDirectory())
}

const resolveWidgetTemplateFile = function (widgetDirectory: string): string[] {
    let paths = [];
    resolveSubdirectories(widgetDirectory).forEach(p => {
        resolveSubdirectories(p).forEach(sub => {
            paths.push(sub);
        });
    });
    return paths;
}

const generateDynamicWidgetContent = function (context: string): string {
    let rootDirectory = path.resolve(context, './src/widgets');
    let dynamicWidgetComponent = `
    // @ts-nocheck

    import loadable from '@react-loadable/revised';
    const Widgets = {};
    `
    dynamicWidgetComponent += fs.readdirSync(rootDirectory).map(p => ({
        path: path.join(rootDirectory, p),
        name: p
    })).filter(p => fs.lstatSync(p.path).isDirectory())
        .map(({ name, path }) => {
            return {
                paths: resolveWidgetTemplateFile(path),
                name
            };
        }).map(({ paths, name }) => paths.map(p => {
            const splitted = p.split('/');
            const falvor = splitted.pop();
            const variant = splitted.pop();
            return `
        Widgets['${name}']['${variant}']['${falvor}'] = Loadable({
            loader: () => import(/* webpackChunkName: '${name}--${variant}--${falvor}' */ '${p}'),
            loading: () => <div>Loading...</div>
        });
    `}).join('')).join('');
    dynamicWidgetComponent += `const NXTDynamicWidget = ({name:string, variant:string, flavor:string}) => { const Widget = Widgets[name][variant][flavor]; return <Widget />; };`
    dynamicWidgetComponent += 'export default NXTDynamicWidget';
    return dynamicWidgetComponent;
}

const loader = function (content: string): string {
    const {
        rootDirectory
    } = this.getOptions({
        "type": "object",
        "properties": {
            "rootDirectory": {
                "type": "string"
            }
        },
        "additionalProperties": false
    });
    if (content.includes("NXTDynamicWidget")) return generateDynamicWidgetContent(rootDirectory);
    return content;
}

export default loader;
module.exports = loader;