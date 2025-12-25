from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('poi', '0014_travelgroup_multilingual_fields'),
    ]

    operations = [
        # BudgetLevel label fields
        migrations.AddField(
            model_name='budgetlevel',
            name='label_es',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='budgetlevel',
            name='label_de',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='budgetlevel',
            name='label_it',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='budgetlevel',
            name='label_pt',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='budgetlevel',
            name='label_ru',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='budgetlevel',
            name='label_ja',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='budgetlevel',
            name='label_zh',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='budgetlevel',
            name='label_hi',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='budgetlevel',
            name='label_ar',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        # BudgetLevel description fields
        migrations.AddField(
            model_name='budgetlevel',
            name='description_es',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='budgetlevel',
            name='description_de',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='budgetlevel',
            name='description_it',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='budgetlevel',
            name='description_pt',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='budgetlevel',
            name='description_ru',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='budgetlevel',
            name='description_ja',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='budgetlevel',
            name='description_zh',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='budgetlevel',
            name='description_hi',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='budgetlevel',
            name='description_ar',
            field=models.TextField(blank=True, default=''),
        ),
        # BudgetCurrency name fields
        migrations.AddField(
            model_name='budgetcurrency',
            name='name_es',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='budgetcurrency',
            name='name_de',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='budgetcurrency',
            name='name_it',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='budgetcurrency',
            name='name_pt',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='budgetcurrency',
            name='name_ru',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='budgetcurrency',
            name='name_ja',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='budgetcurrency',
            name='name_zh',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='budgetcurrency',
            name='name_hi',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='budgetcurrency',
            name='name_ar',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        # BudgetFlexibilityOption label fields
        migrations.AddField(
            model_name='budgetflexibilityoption',
            name='label_es',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='budgetflexibilityoption',
            name='label_de',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='budgetflexibilityoption',
            name='label_it',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='budgetflexibilityoption',
            name='label_pt',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='budgetflexibilityoption',
            name='label_ru',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='budgetflexibilityoption',
            name='label_ja',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='budgetflexibilityoption',
            name='label_zh',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='budgetflexibilityoption',
            name='label_hi',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='budgetflexibilityoption',
            name='label_ar',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        # BudgetFlexibilityOption description fields
        migrations.AddField(
            model_name='budgetflexibilityoption',
            name='description_es',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='budgetflexibilityoption',
            name='description_de',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='budgetflexibilityoption',
            name='description_it',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='budgetflexibilityoption',
            name='description_pt',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='budgetflexibilityoption',
            name='description_ru',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='budgetflexibilityoption',
            name='description_ja',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='budgetflexibilityoption',
            name='description_zh',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='budgetflexibilityoption',
            name='description_hi',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='budgetflexibilityoption',
            name='description_ar',
            field=models.TextField(blank=True, default=''),
        ),
    ]
