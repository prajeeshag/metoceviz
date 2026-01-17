import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import { default as glslOptimize } from 'rollup-plugin-glsl-optimize';
import resolve from '@rollup/plugin-node-resolve';
import watch from 'rollup-plugin-watch-globs';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

const buildConfigs = [
    {
        input: 'src/mapviz.ts',
        output: {
            file: 'dist/mapviz.js',
        }
    }
];

function createConfig({ input, output }) {
    return {
        input,
        output: {
            file: output.file,
            name: output.name,
            sourcemap: true,
            inlineDynamicImports: true,
        },
        plugins: [
            watch(["src/**/*.glsl"]),
            glslOptimize({
                include: ['src/**/*.glsl'],
                optimize: false,
                sourceMap: true,
            }),
            resolve({
                browser: true,
            }),
            json(),
            commonjs({
                ignore: ['pino', /* or 'pino-pretty' */],
                // or exclude: ['node_modules/pino/**', 'node_modules/pino-pretty/**']
            }),
            typescript({
                tsconfig: './tsconfig.json',
                declaration: true,
                // declarationDir: 'dist/types',
            }),
        ],
        watch: {
            include: ['src/**', 'src/**/*.glsl'],
            clearScreen: true,
        },
    };
}

export default defineConfig(buildConfigs.map(createConfig));
