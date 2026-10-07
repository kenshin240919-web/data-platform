import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests',workers:1,use:{baseURL:'http://localhost:3101',headless:true,channel:'msedge'},reporter:'list'});
