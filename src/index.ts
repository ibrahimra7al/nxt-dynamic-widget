import * as path from 'path';
import * as fs from 'fs';

const resolveWidgetTemplateFile = function (widgetDirectory: string): string {
    return '';
}

const generateDynamicWidgetContent = function(context: string): string {
    let rootDirectory = path.resolve(context, '/widgets');
    let dynamicWidgetComponent = `
    import Loadable from 'react-loadable';
    const Widgets = {};
    `
    dynamicWidgetComponent += fs.readdirSync(rootDirectory).filter(p => fs.lstatSync(p).isDirectory()).map(d => {
        const templatePath = resolveWidgetTemplateFile(path.join(rootDirectory, d));
        return {
            path: templatePath,
            name: d
        };
    }).map(({path, name}) => `
        Widgets['${name}'] = Loadable({
            loader: () => import(/* webpackChunkName: '${path}' */ '${path}'),
            loading: () => <div>Loading...</div>
        });
    `).join('');
    dynamicWidgetComponent += `const WebpackNXTDynamicWidget = ({name}) => <Widgets[name] />;`
    dynamicWidgetComponent += 'export default WebpackNXTDynamicWidget';
    return dynamicWidgetComponent;
}

const loader = function (content:string) :string {
    if(content.includes("WebpackNXTDynamicWidget")) return generateDynamicWidgetContent(this.context);
    return content;
}

export default loader;
module.exports = loader;