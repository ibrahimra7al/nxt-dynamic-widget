import * as path from 'path';
import * as fs from 'fs';

const resolveSubdirectories = function (context: string): string[] {
    return fs
        .readdirSync(context)
        .map(p => path.join(context, p))
        .filter(p => fs.existsSync(p) && fs.lstatSync(p).isDirectory())
}

const resolveWidgetTemplateFile = function (widgetDirectory: string): string[] {
    const paths = [];
    resolveSubdirectories(widgetDirectory).forEach(p => {
        resolveSubdirectories(p).forEach(sub => {
            paths.push(sub);
        });
    });
    return paths;
}

const generateDynamicWidgetContent = function (context: string): string {
    const rootDirectory = path.resolve(context, './src/widgets');
    let dynamicWidgetComponent = `
    // @ts-nocheck

    const loadable = require('@react-loadable/revised');
    const React = require('react');
    const Widgets = {};
    const Loading = (props)=> { 
        if (props.isLoading) {
            if (props.timedOut) {
                return <div>Loader timed out!</div>
            } else if (props.pastDelay) {
                return <div>Loading...</div>
            } else {
                return null
            }
        } else if (props.error) {
            return <div>Error! Component failed to load</div>
        } else {
            return null
        }
    }
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
            if (!Widgets['${name}']) {
                Widgets['${name}'] = {};
            }
            if (!Widgets['${name}']['${variant}']) {
                Widgets['${name}']['${variant}'] = {};
            }
            Widgets['${name}']['${variant}']['${falvor}'] = loadable.default({
                loader: () => import(/* webpackChunkName: "${name}--${variant}--${falvor}" */ '${p}'),
                loading: Loading,
                modules: ['${p}'],
                webpack: () => Object.keys(__webpack_modules__)
            });
    `}).join('')).join('');
    dynamicWidgetComponent += `const NXTDynamicWidget = ({name, variant, flavor, dropzoneName, dropzoneOrder}) => { 
        if (Widgets[name] && Widgets[name][variant] && Widgets[name][variant][flavor]) {
            const Widget = Widgets[name][variant][flavor];
            return <Widget dropzone={dropzoneName} order={dropzoneOrder} />;
        }
        return <h1>Widget not found</h1>;
     };`
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
    const xx = generateDynamicWidgetContent(rootDirectory);
    if (content.includes("NXTDynamicWidget")) return xx;
    return content;
}

export default loader;